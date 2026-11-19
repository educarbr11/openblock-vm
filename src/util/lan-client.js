/** Local Link bridge for editor-to-editor LAN messages. No project data is sent automatically. */
class LanClient {
    constructor (runtime, options = {}) {
        this.runtime = runtime;
        this.onMessage = options.onMessage || (() => {});
        this.onStatus = options.onStatus || (() => {});
        this.timeoutMs = options.timeoutMs || 3000;
        this.retryMs = options.retryMs || 1000;
        this.channel = 6;
        this.status = 'disconnected';
        this._joinedChannel = null;
        this._socket = null;
        this._pending = new Map();
        this._nextId = 1;
        this._disposed = false;
        this._connectPromise = null;
        this._retryTimer = null;
        this._retryCount = 0;
        this._openTimer = null;
        this._rejectOpen = null;
    }

    connect (channel = this.channel) {
        if (!Number.isInteger(channel) || channel < 1 || channel > 16) {
            return Promise.reject(new Error('Invalid LAN channel'));
        }
        if (this._disposed) return Promise.reject(new Error('LAN client disposed'));
        this.channel = channel;
        if (this._connectPromise) return this._connectPromise;
        if (this.status === 'connected' && this._joinedChannel === channel) return Promise.resolve();
        clearTimeout(this._retryTimer);
        this._retryTimer = null;
        this._setStatus('connecting');
        const opening = this._socket ? Promise.resolve() : this._open();
        this._connectPromise = opening.then(() => this._join()).then(() => {
            if (this._disposed) throw new Error('LAN client disposed');
            this._connectPromise = null;
            this._retryCount = 0;
            this._setStatus('connected');
        }, error => {
            this._connectPromise = null;
            this._fail(error);
            throw error;
        });
        return this._connectPromise;
    }

    setChannel (channel) {
        return this.connect(channel);
    }

    broadcast (message, value) {
        return this.connect().then(() => this._request('broadcast', {message, value}));
    }

    dispose () {
        this._disposed = true;
        clearTimeout(this._retryTimer);
        this._retryTimer = null;
        this._close(new Error('LAN client disposed'));
        this._setStatus('disconnected');
    }

    _setStatus (status, error) {
        if (this._disposed && status !== 'disconnected') return;
        if (this.status === status && !error) return;
        this.status = status;
        this.onStatus({status, channel: this.channel, error: error ? error.message : null});
    }

    _open () {
        return new Promise((resolve, reject) => {
            this._rejectOpen = reject;
            try {
                const socket = this.runtime.getScratchLinkSocket('LAN');
                this._socket = socket;
                socket.setOnOpen(() => {
                    if (this._socket !== socket) return;
                    clearTimeout(this._openTimer);
                    this._openTimer = null;
                    this._rejectOpen = null;
                    resolve();
                });
                socket.setOnClose(() => {
                    if (this._socket === socket) this._fail(new Error('LAN bridge disconnected'));
                });
                socket.setOnError(() => {
                    if (this._socket === socket) this._fail(new Error('LAN bridge unavailable'));
                });
                socket.setHandleMessage(message => {
                    if (this._socket === socket) this._handleMessage(message);
                });
                this._openTimer = setTimeout(() => this._fail(new Error('LAN connection timed out')), this.timeoutMs);
                socket.open();
            } catch (error) {
                reject(error);
            }
        });
    }

    _join () {
        const channel = this.channel;
        return this._request('join', {channel}).then(result => {
            if (this._disposed) throw new Error('LAN client disposed');
            if (!result || result.channel !== channel) throw new Error('Invalid LAN join response');
            this._joinedChannel = channel;
            if (this.channel !== channel) return this._join();
        });
    }

    _request (method, params) {
        return new Promise((resolve, reject) => {
            if (this._pending.size >= 128) {
                reject(new Error('Too many pending LAN messages'));
                return;
            }
            const id = this._nextId++;
            const timer = setTimeout(() => {
                this._pending.delete(id);
                const error = new Error('LAN request timed out');
                reject(error);
                this._fail(error);
            }, this.timeoutMs);
            this._pending.set(id, {resolve, reject, timer});
            try {
                if (!this._socket) throw new Error('LAN bridge unavailable');
                this._socket.sendMessage({jsonrpc: '2.0', id, method, params});
            } catch (error) {
                clearTimeout(timer);
                this._pending.delete(id);
                reject(error);
            }
        });
    }

    _handleMessage (message) {
        if (!message || message.jsonrpc !== '2.0') return;
        if (message.method === 'message') {
            const packet = message.params;
            if (this.status !== 'connected' || !packet || packet.channel !== this.channel ||
                typeof packet.message !== 'string' || !packet.message.trim() ||
                Array.from(packet.message).length > 128 || typeof packet.value !== 'string' ||
                Array.from(packet.value).length > 1024) return;
            this.onMessage({channel: packet.channel, message: packet.message, value: packet.value});
            return;
        }
        const pending = this._pending.get(message.id);
        if (!pending) return;
        this._pending.delete(message.id);
        clearTimeout(pending.timer);
        if (message.error) pending.reject(new Error(message.error.message || 'LAN request failed'));
        else pending.resolve(message.result);
    }

    _close (error) {
        clearTimeout(this._openTimer);
        this._openTimer = null;
        if (this._rejectOpen) this._rejectOpen(error);
        this._rejectOpen = null;
        for (const pending of this._pending.values()) {
            clearTimeout(pending.timer);
            pending.reject(error);
        }
        this._pending.clear();
        const socket = this._socket;
        this._socket = null;
        this._joinedChannel = null;
        if (socket) {
            try {
                socket.close();
            } catch (closeError) {
                // A connection that failed to open may already have been closed.
            }
        }
    }

    _fail (error) {
        this._close(error);
        if (this._disposed) return;
        this._setStatus('error', error);
        if (!this._retryTimer) {
            this._retryTimer = setTimeout(() => {
                this._retryTimer = null;
                this.connect().catch(() => {});
            }, Math.min(5000, this.retryMs * Math.pow(2, this._retryCount++)));
        }
    }
}

module.exports = LanClient;
