/**
 * ScratchLinkSocket-compatible transport backed by the browser Web Serial API.
 * This is used on ChromeOS so Arduino realtime mode can run without a local
 * OpenBlock Link process.
 */
class ScratchLinkWebSerial {
    constructor (type) {
        this._type = type;
        this._onOpen = null;
        this._onClose = null;
        this._onError = null;
        this._handleMessage = null;

        this._isOpen = false;
        this._ports = {};
        this._port = null;
        this._portId = null;
        this._reader = null;
        this._readActive = false;
        this._serialOptions = {
            baudRate: 57600,
            dataBits: 8,
            stopBits: 1
        };
    }

    static isSupported (type) {
        if (type !== 'SERIALPORT') return false;
        if (typeof navigator === 'undefined' || !navigator.serial) return false;
        if (typeof navigator.userAgent !== 'string') return false;
        return navigator.userAgent.indexOf('CrOS') !== -1;
    }

    open () {
        if (this._type !== 'SERIALPORT') {
            throw new Error(`Unknown Web Serial socket Type: ${this._type}`);
        }
        if (!navigator.serial) {
            throw new Error('Web Serial is not available in this browser');
        }
        if (this._onOpen && this._onClose && this._onError && this._handleMessage) {
            this._isOpen = true;
            window.setTimeout(this._onOpen, 0);
        } else {
            throw new Error('Must set open, close, message and error handlers before calling open on the socket');
        }
    }

    async close () {
        await this._disconnectPort();
        this._isOpen = false;
        if (this._onClose) {
            this._onClose();
        }
    }

    sendMessage (message) {
        this._handleRequest(message);
    }

    setOnOpen (fn) {
        this._onOpen = fn;
    }

    setOnClose (fn) {
        this._onClose = fn;
    }

    setOnError (fn) {
        this._onError = fn;
    }

    setHandleMessage (fn) {
        this._handleMessage = fn;
    }

    isOpen () {
        return this._isOpen;
    }

    async _handleRequest (request) {
        try {
            const result = await this._dispatch(request.method, request.params || {});
            this._sendResponse(request.id, result, null);
        } catch (error) {
            this._sendResponse(request.id, null, {
                message: error && error.message ? error.message : String(error)
            });
            if (this._onError) {
                this._onError(error);
            }
        }
    }

    _sendResponse (id, result, error) {
        if (typeof id === 'undefined') return;
        const response = {
            jsonrpc: '2.0',
            id: id
        };
        if (error) {
            response.error = error;
        } else {
            response.result = result || null;
        }
        this._handleMessage(response);
    }

    _sendRemoteRequest (method, params) {
        this._handleMessage({
            jsonrpc: '2.0',
            method: method,
            params: params
        });
    }

    async _dispatch (method, params) {
        switch (method) {
        case 'discover':
            return this._discover(params);
        case 'connect':
            return this._connect(params);
        case 'disconnect':
            return this._disconnectPort();
        case 'updateBaudrate':
            return this._updateBaudrate(params);
        case 'write':
            return this._write(params);
        case 'read':
            return this._read();
        case 'upload':
        case 'uploadFirmware':
            this._sendRemoteRequest('uploadError', {
                message: 'Upload is not available with Web Serial on Chromebook. Install the realtime firmware first.'
            });
            return null;
        case 'abortUpload':
        case 'getServices':
            return null;
        case 'pingMe':
            this._sendRemoteRequest('ping', null);
            return 'willPing';
        default:
            throw new Error(`Method not found: ${method}`);
        }
    }

    async _discover (params) {
        this._ports = {};
        let ports = await navigator.serial.getPorts();

        if (ports.length === 0 && navigator.userActivation && navigator.userActivation.isActive) {
            try {
                ports = [await navigator.serial.requestPort(this._makeRequestOptions(params.filters || {}))];
            } catch (error) {
                if (error && error.name === 'NotFoundError') {
                    return null;
                }
                throw error;
            }
        }

        ports
            .filter(port => this._matchesFilters(port, params.filters || {}))
            .forEach(port => this._reportPort(port));
        return null;
    }

    _makeRequestOptions (filters) {
        if (filters.pnpid && filters.pnpid.includes('*')) {
            return {};
        }
        const serialFilters = (filters.pnpid || [])
            .map(this._parsePnpId)
            .filter(Boolean)
            .map(info => ({
                usbVendorId: info.vendorId,
                usbProductId: info.productId
            }));
        return serialFilters.length > 0 ? {filters: serialFilters} : {};
    }

    _matchesFilters (port, filters) {
        if (!filters.pnpid || filters.pnpid.includes('*')) {
            return true;
        }
        const info = port.getInfo();
        return filters.pnpid.some(pnpid => {
            const parsed = this._parsePnpId(pnpid);
            return parsed &&
                parsed.vendorId === info.usbVendorId &&
                parsed.productId === info.usbProductId;
        });
    }

    _parsePnpId (pnpid) {
        const match = /^USB\\VID_([0-9A-F]{4})&PID_([0-9A-F]{4})$/i.exec(pnpid);
        if (!match) return null;
        return {
            vendorId: parseInt(match[1], 16),
            productId: parseInt(match[2], 16)
        };
    }

    _reportPort (port) {
        const info = port.getInfo();
        const vendor = typeof info.usbVendorId === 'number' ?
            info.usbVendorId.toString(16).toUpperCase()
                .padStart(4, '0') : '0000';
        const product = typeof info.usbProductId === 'number' ?
            info.usbProductId.toString(16).toUpperCase()
                .padStart(4, '0') : '0000';
        const id = `webserial:${vendor}:${product}:${Object.keys(this._ports).length}`;
        this._ports[id] = port;
        this._sendRemoteRequest('didDiscoverPeripheral', {
            peripheralId: id,
            name: `Web Serial USB (${vendor}:${product})`
        });
    }

    async _connect (params) {
        const port = this._ports[params.peripheralId];
        if (!port) {
            throw new Error(`invalid peripheral ID: ${params.peripheralId}`);
        }
        const config = params.peripheralConfig && params.peripheralConfig.config ?
            params.peripheralConfig.config : {};
        this._serialOptions = {
            baudRate: config.baudRate || this._serialOptions.baudRate,
            dataBits: config.dataBits || this._serialOptions.dataBits,
            stopBits: config.stopBits || this._serialOptions.stopBits
        };
        await port.open(this._serialOptions);
        this._port = port;
        this._portId = params.peripheralId;
        return null;
    }

    async _disconnectPort () {
        this._readActive = false;
        if (this._reader) {
            try {
                await this._reader.cancel();
            } catch (e) {
                // Ignore cancellation errors during shutdown.
            }
            try {
                this._reader.releaseLock();
            } catch (e) {
                // Ignore lock release errors during shutdown.
            }
            this._reader = null;
        }
        if (this._port) {
            await this._port.close();
            this._port = null;
            this._portId = null;
        }
        return null;
    }

    async _updateBaudrate (params) {
        if (!params || !params.baudRate) {
            return null;
        }
        this._serialOptions = Object.assign({}, this._serialOptions, {
            baudRate: params.baudRate
        });
        if (this._port && this._portId) {
            const portId = this._portId;
            const port = this._port;
            await this._disconnectPort();
            await port.open(this._serialOptions);
            this._port = port;
            this._portId = portId;
        }
        return null;
    }

    async _write (params) {
        if (!this._port || !this._port.writable) {
            throw new Error('Serial port is not connected');
        }
        const writer = this._port.writable.getWriter();
        try {
            await writer.write(this._decodeMessage(params.message, params.encoding));
        } finally {
            writer.releaseLock();
        }
        return null;
    }

    async _read () {
        if (!this._port || !this._port.readable || this._readActive) {
            return null;
        }
        this._readActive = true;
        this._reader = this._port.readable.getReader();
        this._readLoop();
        return null;
    }

    async _readLoop () {
        try {
            while (this._readActive && this._reader) {
                const result = await this._reader.read();
                if (result.done) break;
                if (result.value) {
                    this._sendRemoteRequest('onMessage', {
                        encoding: 'base64',
                        message: this._toBase64(result.value)
                    });
                }
            }
        } catch (error) {
            if (this._readActive) {
                this._sendRemoteRequest('peripheralUnplug', null);
                if (this._onError) {
                    this._onError(error);
                }
            }
        }
    }

    _decodeMessage (message, encoding) {
        if (encoding === 'base64') {
            const binary = window.atob(message);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            return bytes;
        }
        if (encoding === 'hex') {
            const bytes = new Uint8Array(message.length / 2);
            for (let i = 0; i < bytes.length; i++) {
                bytes[i] = parseInt(message.substr(i * 2, 2), 16);
            }
            return bytes;
        }
        return new TextEncoder().encode(message);
    }

    _toBase64 (bytes) {
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }
}

module.exports = ScratchLinkWebSerial;
