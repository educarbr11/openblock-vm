const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const LanClient = require('../../util/lan-client');
const formatMessage = require('format-message');

const DEFAULT_CHANNEL = 6;
const MAX_PENDING_MESSAGES = 128;
const MAX_MESSAGE_LENGTH = 128;
const MAX_VALUE_LENGTH = 1024;
const HAT_OPCODE = 'lan_whenReceived';
const blockIconURI = `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">' +
    '<g fill="none" stroke="white" stroke-width="3" stroke-linejoin="round">' +
    '<rect x="13" y="3" width="14" height="10" rx="2"/><path d="M20 13v9M7 22h26M7 22v5M33 22v5"/>' +
    '<rect x="1" y="27" width="12" height="10" rx="2"/>' +
    '<rect x="27" y="27" width="12" height="10" rx="2"/></g></svg>'
)}`;

class Scratch3LanBlocks {
    get EXTENSION_ID () {
        return 'lan';
    }

    constructor (runtime) {
        this.runtime = runtime;
        this._channel = DEFAULT_CHANNEL;
        this._receivedValues = new Map();
        this._pendingMessages = [];
        this._receivingEnabled = this._editorActive();
        this._disposed = false;
        this._clientSuspended = false;
        this._dispatchPending = this._dispatchPending.bind(this);
        this._onProjectStart = this._onProjectStart.bind(this);
        this._onStopAll = this._onStopAll.bind(this);
        this._onProjectLoaded = this._onProjectLoaded.bind(this);
        this.reconnect = this.reconnect.bind(this);
        this.suspend = this.suspend.bind(this);
        this._client = this._createClient();
        runtime.on('BEFORE_EXECUTE', this._dispatchPending);
        runtime.on('PROJECT_START', this._onProjectStart);
        runtime.on('PROJECT_STOP_ALL', this._onStopAll);
        runtime.on('PROJECT_LOADED', this._onProjectLoaded);
        runtime.on('LAN_CONNECT_REQUEST', this.reconnect);
        runtime.on('LAN_DISCONNECT_REQUEST', this.suspend);
        this._connect();
    }

    getInfo () {
        const messageArgument = () => ({
            type: ArgumentType.STRING,
            defaultValue: formatMessage({
                id: 'lan.defaultMessage',
                default: 'message',
                description: 'Default name for a LAN message'
            })
        });
        return [{
            id: 'lan',
            name: 'LAN',
            color1: '#008573',
            color2: '#006D60',
            color3: '#00564C',
            blockIconURI,
            menuIconURI: blockIconURI,
            blocks: [
                {
                    blockType: BlockType.BUTTON,
                    func: 'LAN_CONNECT',
                    text: formatMessage({
                        id: 'lan.connect',
                        default: 'Connect to LAN',
                        description: 'Retry connecting to the local Link service for LAN messaging'
                    })
                },
                {
                    opcode: 'broadcast',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'lan.broadcast',
                        default: 'broadcast message [MESSAGE] on LAN',
                        description: 'Send a named message to editors on the local network channel'
                    }),
                    arguments: {MESSAGE: messageArgument()}
                },
                {
                    opcode: 'broadcastWithValue',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'lan.broadcastWithValue',
                        default: 'broadcast message [MESSAGE] with value [VALUE] on LAN',
                        description: 'Send a named message and value on the local network'
                    }),
                    arguments: {
                        MESSAGE: messageArgument(),
                        VALUE: {type: ArgumentType.STRING, defaultValue: '1'}
                    }
                },
                {
                    opcode: 'whenReceived',
                    blockType: BlockType.HAT,
                    isEdgeActivated: false,
                    shouldRestartExistingThreads: false,
                    text: formatMessage({
                        id: 'lan.whenReceived',
                        default: 'when receiving [MESSAGE] broadcast on LAN',
                        description: 'Run when this named message arrives on the local network'
                    }),
                    arguments: {MESSAGE: messageArgument()}
                },
                {
                    opcode: 'valueReceived',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    text: formatMessage({
                        id: 'lan.valueReceived',
                        default: 'LAN broadcast [MESSAGE] value received',
                        description: 'Read the value received with the named local network message'
                    }),
                    arguments: {MESSAGE: messageArgument()}
                },
                {
                    opcode: 'setChannel',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'lan.setChannel',
                        default: 'set LAN channel to [CHANNEL]',
                        description: 'Select the group of editors that exchange local network messages'
                    }),
                    arguments: {CHANNEL: {type: ArgumentType.NUMBER, menu: 'CHANNELS', defaultValue: '6'}}
                }
            ],
            menus: {
                CHANNELS: {
                    acceptReporters: false,
                    items: Array.from({length: 16}, (_, index) => ({
                        text: index === DEFAULT_CHANNEL - 1 ? formatMessage({
                            id: 'lan.defaultChannel',
                            default: '6 (default)',
                            description: 'Default LAN channel menu option'
                        }) : String(index + 1),
                        value: String(index + 1)
                    }))
                }
            }
        }];
    }

    broadcast (args) {
        return this._broadcast(args.MESSAGE, '');
    }

    broadcastWithValue (args) {
        return this._broadcast(args.MESSAGE, args.VALUE);
    }

    _broadcast (message, value) {
        if (this._disposed || !this._editorActive()) return Promise.resolve();
        const name = Cast.toString(message).trim();
        const text = Cast.toString(value);
        if (!this._validMessage(name) || Array.from(text).length > MAX_VALUE_LENGTH) {
            this._reportError('invalid_message');
            return Promise.resolve();
        }
        this._receivingEnabled = true;
        return this._runClient('broadcast', name, text);
    }

    setChannel (args) {
        if (this._disposed || !this._editorActive()) return Promise.resolve();
        const channel = Number(args.CHANNEL);
        if (!Number.isInteger(channel) || channel < 1 || channel > 16) {
            this._reportError('invalid_channel');
            return Promise.resolve();
        }
        this._receivingEnabled = true;
        if (channel !== this._channel) {
            this._channel = channel;
            this._receivedValues.clear();
            this._pendingMessages = [];
        }
        return this._runClient('setChannel', channel);
    }

    whenReceived (args, util) {
        if (!this._editorActive() || !this._receivingEnabled || !util || !util.thread) return false;
        const key = this._scriptKey(util.thread.topBlock, util.target);
        const name = Cast.toString(args.MESSAGE).trim();
        // Each script consumes its own deliveries, including messages queued while it was busy.
        for (const packet of this._pendingMessages) {
            if (!packet.pendingScripts.has(key)) continue;
            packet.pendingScripts.delete(key);
            if (packet.channel === this._channel && packet.message === name) {
                // A later network packet must not replace this handler's event value.
                util.thread._lanPacket = packet;
                return true;
            }
        }
        return false;
    }

    valueReceived (args, util) {
        const name = Cast.toString(args.MESSAGE).trim();
        const packet = util && util.thread && util.thread._lanPacket;
        if (packet && packet.channel === this._channel && packet.message === name) return packet.value;
        return this._receivedValues.has(name) ? this._receivedValues.get(name) : '';
    }

    _validMessage (message) {
        return message.length > 0 && Array.from(message).length <= MAX_MESSAGE_LENGTH;
    }

    _onMessage (packet) {
        if (this._disposed || !this._editorActive() || this._clientSuspended ||
            packet.channel !== this._channel) return;
        const message = packet.message.trim();
        this._receivedValues.delete(message);
        this._receivedValues.set(message, packet.value);
        if (this._receivedValues.size > MAX_PENDING_MESSAGES) {
            this._receivedValues.delete(this._receivedValues.keys().next().value);
        }
        if (!this._receivingEnabled) return;
        const pendingScripts = this._scriptKeys();
        if (!pendingScripts.size) return;
        if (this._pendingMessages.length >= MAX_PENDING_MESSAGES) {
            this._pendingMessages.shift();
            this._reportError('message_queue_full');
        }
        this._pendingMessages.push(Object.assign({}, packet, {message, pendingScripts}));
    }

    _scriptKey (blockId, target) {
        return JSON.stringify([target.id, blockId]);
    }

    _scriptKeys () {
        const keys = new Set();
        this.runtime.allScriptsByOpcodeDo(HAT_OPCODE, (script, target) => {
            keys.add(this._scriptKey(script.blockId, target));
        });
        return keys;
    }

    _dispatchPending () {
        if (this._disposed || !this._editorActive() || !this._receivingEnabled || !this._pendingMessages.length) return;
        const currentScripts = this._scriptKeys();
        for (const packet of this._pendingMessages) {
            for (const key of packet.pendingScripts) {
                if (!currentScripts.has(key)) packet.pendingScripts.delete(key);
            }
        }
        this.runtime.startHats(HAT_OPCODE);
        this._pendingMessages = this._pendingMessages.filter(packet => packet.pendingScripts.size);
    }

    _connect () {
        if (this._disposed || !this._editorActive()) return Promise.resolve();
        return this._runClient('connect', this._channel);
    }

    _editorActive () {
        return this.runtime.lanEditorActive !== false;
    }

    _createClient () {
        const client = new LanClient(this.runtime, {
            onMessage: packet => {
                if (this._client === client) this._onMessage(packet);
            },
            onStatus: state => {
                if (!this._disposed && this._editorActive() && !this._clientSuspended && this._client === client) {
                    this.runtime.emit('LAN_STATUS', state);
                }
            }
        });
        return client;
    }

    _runClient (method, ...args) {
        if (this._disposed || !this._editorActive()) return Promise.resolve();
        if (this._clientSuspended) {
            this._client = this._createClient();
            this._clientSuspended = false;
        }
        const client = this._client;
        const operation = method === 'broadcast' ? client.connect(this._channel).then(() => {
            if (this._editorActive() && !this._clientSuspended && this._client === client) {
                return client.broadcast(...args);
            }
        }) : client[method](...args);
        return operation
            .then(() => {
                if (this._client === client) this._reportConnected();
            })
            .catch(error => {
                if (this._client === client) this._reportError(error);
            });
    }

    reconnect () {
        if (this._disposed || !this._editorActive()) return Promise.resolve();
        this._receivingEnabled = true;
        return this._connect();
    }

    suspend () {
        if (this._disposed || this._clientSuspended) return;
        this._receivingEnabled = false;
        this._pendingMessages = [];
        this._receivedValues.clear();
        this._clientSuspended = true;
        this._client.dispose();
        this.runtime.emit('LAN_STATUS', {status: 'disconnected', channel: this._channel});
    }

    _reportError (error) {
        if (this._disposed || !this._editorActive() || this._clientSuspended) return;
        this.runtime.emit('LAN_STATUS', {
            status: 'error',
            error: typeof error === 'string' ? error : error.code || error.message || 'connection_failed',
            channel: this._channel
        });
    }

    _reportConnected () {
        if (!this._disposed && this._editorActive() && !this._clientSuspended && this._client.status === 'connected') {
            this.runtime.emit('LAN_STATUS', {status: 'connected', channel: this._channel});
        }
    }

    _onProjectStart () {
        if (this._disposed || !this._editorActive()) return;
        this._receivingEnabled = true;
        this._connect();
    }

    _onStopAll () {
        this._receivingEnabled = false;
        this._pendingMessages = [];
    }

    _onProjectLoaded () {
        this._receivedValues.clear();
        this._pendingMessages = [];
        this._channel = DEFAULT_CHANNEL;
        this._receivingEnabled = this._editorActive() && !this._clientSuspended;
        if (!this._clientSuspended) this._connect();
    }

    dispose () {
        this._disposed = true;
        this._pendingMessages = [];
        this._receivedValues.clear();
        this.runtime.removeListener('BEFORE_EXECUTE', this._dispatchPending);
        this.runtime.removeListener('PROJECT_START', this._onProjectStart);
        this.runtime.removeListener('PROJECT_STOP_ALL', this._onStopAll);
        this.runtime.removeListener('PROJECT_LOADED', this._onProjectLoaded);
        this.runtime.removeListener('LAN_CONNECT_REQUEST', this.reconnect);
        this.runtime.removeListener('LAN_DISCONNECT_REQUEST', this.suspend);
        this._client.dispose();
    }
}

module.exports = Scratch3LanBlocks;
