class LanSocket {
    constructor () {
        this.requests = [];
        this.closed = false;
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
        this.onOpen();
    }
    close () {
        this.closed = true;
        if (this.onClose) this.onClose();
    }
    sendMessage (request) {
        this.requests.push(request);
        const result = request.method === 'join' ? {channel: request.params.channel} : {sent: true};
        this.onMessage({jsonrpc: '2.0', id: request.id, result});
    }
    receive (message, value = '', channel = 6) {
        this.onMessage({jsonrpc: '2.0', method: 'message', params: {message, value, channel}});
    }
}

module.exports = LanSocket;
