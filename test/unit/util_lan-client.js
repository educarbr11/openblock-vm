const test = require('tap').test;
const LanClient = require('../../src/util/lan-client');
const ScratchLinkWebSocket = require('../../src/util/scratch-link-websocket');

class FakeSocket {
    constructor () {
        this.requests = [];
    }
    setOnOpen (callback) {
        this.onOpen = callback;
    }
    setOnClose (callback) {
        this.onClose = callback;
    }
    setOnError (callback) {
        this.onError = callback;
    }
    setHandleMessage (callback) {
        this.onMessage = callback;
    }
    open () {
        setImmediate(() => this.onOpen());
    }
    close () {
        this.closed = true;
    }
    sendMessage (request) {
        this.requests.push(request);
        if (!this.silent) {
            setImmediate(() => this.onMessage({
                jsonrpc: '2.0',
                id: request.id,
                result: request.method === 'join' ? {channel: request.params.channel} : true
            }));
        }
    }
    receive (params) {
        this.onMessage({jsonrpc: '2.0', method: 'message', params});
    }
}

const setup = (t, options = {}) => {
    const sockets = [];
    const statuses = [];
    const received = [];
    const runtime = {getScratchLinkSocket: type => {
        t.equal(type, 'LAN', 'uses the LAN Link endpoint');
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket;
    }};
    const client = new LanClient(runtime, Object.assign({
        onStatus: state => statuses.push(state),
        onMessage: packet => received.push(packet),
        timeoutMs: 100,
        retryMs: 10000
    }, options));
    t.teardown(() => client.dispose());
    return {client, sockets, statuses, received};
};

test('LAN client joins default channel and sends a value only after joining', async t => {
    const {client, sockets, statuses} = setup(t);
    await client.broadcast('hello', '42');
    t.same(sockets[0].requests.map(request => [request.method, request.params]), [
        ['join', {channel: 6}], ['broadcast', {message: 'hello', value: '42'}]
    ]);
    t.equal(statuses[statuses.length - 1].status, 'connected');
    t.equal(client._pending.size, 0, 'completes all requests');
});

test('LAN client isolates channels and ignores malformed notifications', async t => {
    const {client, sockets, received} = setup(t);
    await client.connect();
    sockets[0].receive({channel: 6, message: 'hello', value: '1'});
    sockets[0].receive({channel: 7, message: 'hello', value: 'wrong channel'});
    sockets[0].receive({channel: 6, message: '', value: 'invalid'});
    sockets[0].receive({channel: 6, message: 'hello', value: {invalid: true}});
    sockets[0].receive({channel: 6, message: 'hello', value: 'a'.repeat(1025)});
    await client.setChannel(7);
    sockets[0].receive({channel: 6, message: 'hello', value: 'old channel'});
    sockets[0].receive({channel: 7, message: 'hello', value: '2'});
    t.same(received, [
        {channel: 6, message: 'hello', value: '1'}, {channel: 7, message: 'hello', value: '2'}
    ]);
});

test('LAN client settles concurrent channel changes on the latest choice', async t => {
    const {client, sockets} = setup(t);
    const first = client.connect(4);
    const second = client.setChannel(8);
    await Promise.all([first, second]);
    t.equal(client.channel, 8);
    t.equal(client._joinedChannel, 8);
    t.equal(sockets.length, 1, 'shares the connection');
    await client.setChannel(8);
    t.equal(sockets.length, 1, 'does not reopen for the same channel');
    await client.setChannel(99).then(() => t.fail('invalid channel accepted'), () => t.pass('rejects invalid channel'));
    t.equal(client.channel, 8);
});

test('LAN bridge failure rejects pending work, reconnects and restores the channel', async t => {
    const {client, sockets, statuses} = setup(t, {retryMs: 5});
    await client.connect(9);
    sockets[0].silent = true;
    const pending = client.broadcast('hello', '1');
    await new Promise(resolve => setImmediate(resolve));
    sockets[0].onClose();
    await pending.then(() => t.fail('closed request resolved'), error => t.match(error.message, /disconnected/));
    await new Promise(resolve => setTimeout(resolve, 25));
    t.equal(sockets.length, 2);
    t.equal(client.status, 'connected');
    t.equal(client._joinedChannel, 9);
    t.ok(statuses.some(state => state.status === 'error'));
    t.same(sockets[1].requests.map(request => request.method), ['join'], 'does not resend after a delivery failure');
});

test('LAN requests time out instead of leaving block execution pending', async t => {
    const {client, sockets} = setup(t, {timeoutMs: 15});
    await client.connect();
    sockets[0].silent = true;
    await client.broadcast('hello', '').then(
        () => t.fail('timeout resolved'), error => t.match(error.message, /timed out/)
    );
    t.equal(client._pending.size, 0);
    t.equal(client.status, 'error');
});

test('unloading LAN cancels pending work and prevents reconnects and stale events', async t => {
    const {client, sockets, received} = setup(t, {retryMs: 5});
    await client.connect();
    sockets[0].silent = true;
    const pending = client.broadcast('hello', '1');
    await new Promise(resolve => setImmediate(resolve));
    client.dispose();
    await pending.then(() => t.fail('disposed request resolved'), error => t.match(error.message, /disposed/));
    sockets[0].onError();
    sockets[0].receive({channel: 6, message: 'hello', value: 'stale'});
    await new Promise(resolve => setTimeout(resolve, 15));
    t.equal(sockets.length, 1);
    t.same(received, []);
    t.equal(client.status, 'disconnected');
    t.equal(client._pending.size, 0);
    await client.connect().then(() => t.fail('disposed client reopened'), () => t.pass('stays disposed'));
});

test('LAN socket targets the local endpoint and configured Link port', t => {
    const originalSocket = global.WebSocket;
    const originalPort = process.env.OPENBLOCK_LINK_PORT;
    let openedUrl;
    global.WebSocket = class {
        constructor (url) {
            openedUrl = url;
        }
        close () {}
    };
    const socket = new ScratchLinkWebSocket('LAN');
    socket.setOnOpen(() => {});
    socket.setOnClose(() => {});
    socket.setOnError(() => {});
    socket.setHandleMessage(() => {});
    process.env.OPENBLOCK_LINK_PORT = '20113';
    socket.open();
    t.equal(openedUrl, 'ws://127.0.0.1:20113/openblock/lan');
    socket.close();
    global.WebSocket = originalSocket;
    if (typeof originalPort === 'undefined') delete process.env.OPENBLOCK_LINK_PORT;
    else process.env.OPENBLOCK_LINK_PORT = originalPort;
    t.end();
});
