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
        this._readRetryCount = 0;
        this._serialOptions = {
            baudRate: 57600,
            dataBits: 8,
            stopBits: 1
        };
        this._uploadAbort = false;
    }

    static isSupported (type) {
        if (type !== 'WEB_SERIAL') return false;
        if (typeof navigator === 'undefined' || !navigator.serial) return false;
        if (typeof window !== 'undefined' && window.isSecureContext === false) return false;
        return true;
    }

    open () {
        if (this._type !== 'WEB_SERIAL') {
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

    close () {
        this._disconnectPort()
            .then(() => {
                this._isOpen = false;
                if (this._onClose) {
                    this._onClose();
                }
            });
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

    _handleRequest (request) {
        Promise.resolve()
            .then(() => this._dispatch(request.method, request.params || {}))
            .then(result => {
                this._sendResponse(request.id, result, null);
            })
            .catch(error => {
                this._sendResponse(request.id, null, {
                    message: error && error.message ? error.message : String(error)
                });
                if (this._onError) {
                    this._onError(error);
                }
            });
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

    _dispatch (method, params) {
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
        case 'stopRead':
            return this._stopRead();
        case 'upload':
            return this._upload(params);
        case 'uploadFirmware':
            this._sendRemoteRequest('uploadError', {
                message: 'Firmware upload with Web Serial must download the firmware from Dogoblock API first.'
            });
            return null;
        case 'abortUpload':
            this._uploadAbort = true;
            return null;
        case 'getServices':
            return null;
        case 'pingMe':
            this._sendRemoteRequest('ping', null);
            return 'willPing';
        default:
            throw new Error(`Method not found: ${method}`);
        }
    }

    _discover (params) {
        this._ports = {};
        const filters = params.filters || {};
        const allowAnyPort = params.deviceId === 'arduinoNano';
        return navigator.serial.getPorts()
            .then(ports => {
                if (ports.length === 0 && navigator.userActivation && navigator.userActivation.isActive) {
                    return navigator.serial.requestPort(this._makeRequestOptions(filters, allowAnyPort))
                        .then(port => [port])
                        .catch(error => {
                            if (error && error.name === 'NotFoundError') {
                                return [];
                            }
                            throw error;
                        });
                }
                return ports;
            })
            .then(ports => {
                ports
                    .filter(port => allowAnyPort || this._matchesFilters(port, filters))
                    .forEach(port => this._reportPort(port));
                return null;
            });
    }

    _makeRequestOptions (filters, allowAnyPort = false) {
        if (allowAnyPort) {
            return {};
        }
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

    _connect (params) {
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
        return port.open(this._serialOptions)
            .then(() => {
                this._port = port;
                this._portId = params.peripheralId;
                return null;
            });
    }

    _disconnectPort () {
        this._readActive = false;
        this._readRetryCount = 0;
        const reader = this._reader;
        this._reader = null;
        const releaseReader = () => {
            if (reader) {
                try {
                    reader.releaseLock();
                } catch (e) {
                    // Ignore lock release errors during shutdown.
                }
            }
        };
        const closePort = () => {
            const port = this._port;
            this._port = null;
            this._portId = null;
            if (!port) return Promise.resolve(null);
            return port.close().then(() => null);
        };
        if (!reader) {
            return closePort();
        }
        return reader.cancel()
            .catch(() => null)
            .then(() => {
                releaseReader();
                return closePort();
            });
    }

    _stopRead () {
        this._readActive = false;
        this._readRetryCount = 0;
        const reader = this._reader;
        this._reader = null;
        if (!reader) {
            return Promise.resolve(null);
        }
        return reader.cancel()
            .catch(() => null)
            .then(() => {
                try {
                    reader.releaseLock();
                } catch (e) {
                    // Ignore lock release errors during intentional read stop.
                }
                return null;
            });
    }

    _updateBaudrate (params) {
        if (!params || !params.baudRate) {
            return null;
        }
        this._serialOptions = Object.assign({}, this._serialOptions, {
            baudRate: params.baudRate
        });
        if (this._port && this._portId) {
            const portId = this._portId;
            const port = this._port;
            return this._disconnectPort()
                .then(() => port.open(this._serialOptions))
                .then(() => {
                    this._port = port;
                    this._portId = portId;
                    return null;
                });
        }
        return null;
    }

    _write (params) {
        if (!this._port || !this._port.writable) {
            throw new Error('Serial port is not connected');
        }
        const writer = this._port.writable.getWriter();
        return writer.write(this._decodeMessage(params.message, params.encoding))
            .then(() => null)
            .finally(() => {
                writer.releaseLock();
            });
    }

    _read () {
        if (!this._port || !this._port.readable || this._readActive) {
            return null;
        }
        this._readActive = true;
        this._readRetryCount = 0;
        this._reader = this._port.readable.getReader();
        this._readLoop();
        return null;
    }

    _readLoop () {
        if (!this._readActive || !this._reader) {
            return;
        }
        this._reader.read()
            .then(result => {
                if (result.done || !this._readActive) {
                    if (this._readActive) {
                        this._recoverReadLoop();
                    }
                    return;
                }
                if (result.value) {
                    this._readRetryCount = 0;
                    this._sendRemoteRequest('onMessage', {
                        encoding: 'base64',
                        message: this._toBase64(result.value)
                    });
                }
                this._readLoop();
            })
            .catch(error => {
                if (this._readActive) {
                    this._recoverReadLoop(error);
                }
            });
    }

    _recoverReadLoop (error = null) {
        const reader = this._reader;
        this._reader = null;
        if (reader) {
            try {
                reader.releaseLock();
            } catch (e) {
                // Ignore lock release errors after transient read failures.
            }
        }

        if (!this._readActive || !this._port || !this._port.readable) {
            return this._emitReadDisconnect(error);
        }

        this._readRetryCount++;
        if (this._readRetryCount > 5) {
            return this._emitReadDisconnect(error);
        }

        window.setTimeout(() => {
            if (!this._readActive || !this._port || !this._port.readable) {
                return this._emitReadDisconnect(error);
            }
            try {
                this._reader = this._port.readable.getReader();
                this._readLoop();
            } catch (e) {
                this._recoverReadLoop(e);
            }
            return null;
        }, 250);
        return null;
    }

    _emitReadDisconnect (error = null) {
        this._readActive = false;
        this._readRetryCount = 0;
        // A Web Serial readable stream can close transiently while Arduino resets
        // or while the board is running a non-Firmata sketch. Keep the logical
        // connection open; writes/uploads will surface their own errors.
        if (error && this._onError) {
            this._onError(error);
        }
        return null;
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

    _decodeTextMessage (message, encoding) {
        if (encoding === 'base64') {
            return window.atob(message);
        }
        if (encoding === 'hex') {
            let text = '';
            for (let i = 0; i < message.length; i += 2) {
                text += String.fromCharCode(parseInt(message.substr(i, 2), 16));
            }
            return text;
        }
        return message;
    }

    _upload (params) {
        const uploadOptions = params.uploadOptions || {};
        this._uploadAbort = false;
        this._sendRemoteRequest('setUploadAbortEnabled', true);
        return this._uploadStk500v1(params)
            .then(() => {
                this._sendRemoteRequest('setUploadAbortEnabled', false);
                this._sendRemoteRequest('uploadSuccess', {
                    aborted: false,
                    firmware: Boolean(uploadOptions.firmware),
                    resumeRealtime: uploadOptions.resumeRealtime !== false
                });
                return null;
            })
            .catch(error => {
                this._sendRemoteRequest('setUploadAbortEnabled', false);
                if (this._uploadAbort) {
                    this._sendRemoteRequest('uploadSuccess', {aborted: true});
                    return null;
                }
                this._sendRemoteRequest('uploadError', {
                    message: error && error.message ? error.message : String(error)
                });
                throw error;
            });
    }

    _uploadStk500v1 (params) {
        const hex = this._decodeTextMessage(params.message, params.encoding);
        const config = params.config || {};
        const fqbn = config.fqbn || '';
        if (!/arduino:avr:(uno|nano)/.test(fqbn)) {
            throw new Error('Web Serial upload currently supports only Arduino Uno and Nano.');
        }
        if (!this._port) {
            throw new Error('Serial port is not connected');
        }

        const isNano = fqbn.indexOf('nano') !== -1;
        const uploadBaudRates = isNano ? [57600, 115200] : [115200];
        const pages = this._hexToPages(hex, 128);
        const port = this._port;
        const portId = this._portId;
        this._sendUploadStdout('Compilado recebido. Iniciando gravação Web Serial...\n');

        return this._disconnectPort()
            .then(() => this._tryUploadBaudRates(port, portId, pages, uploadBaudRates))
            .then(() => {
                this._sendUploadStdout('Gravação concluída.\n');
                return this._reopenAfterUpload(port, portId);
            });
    }

    _tryUploadBaudRates (port, portId, pages, baudRates, index = 0) {
        const baudRate = baudRates[index];
        this._sendUploadStdout(`Tentando bootloader em ${baudRate} bps...\n`);
        return this._uploadWithBaudRate(port, portId, pages, baudRate)
            .catch(error => this._closeUploadPort(port)
                .then(() => {
                    if (index + 1 >= baudRates.length) {
                        throw error;
                    }
                    this._sendUploadStdout(
                        `Bootloader nao respondeu em ${baudRate} bps. Tentando outro modo...\n`
                    );
                    return this._sleep(450)
                        .then(() => this._tryUploadBaudRates(port, portId, pages, baudRates, index + 1));
                })
            );
    }

    _uploadWithBaudRate (port, portId, pages, baudRate) {
        return this._sleep(250)
            .then(() => port.open({
                baudRate,
                dataBits: 8,
                stopBits: 1
            }))
            .then(() => {
                this._port = port;
                this._portId = portId || 'webserial:upload';
                return this._resetAvrBootloader(port);
            })
            .then(() => this._createStk500Session(port))
            .then(session => this._syncStk500(session)
                .then(() => this._programPages(session, pages))
                .then(() => this._leaveProgrammingMode(session))
                .finally(() => session.close())
            );
    }

    _closeUploadPort (port) {
        this._port = null;
        this._portId = null;
        if (!port) return Promise.resolve(null);
        return port.close()
            .catch(() => null)
            .then(() => null);
    }

    _reopenAfterUpload (port, portId) {
        this._sendUploadStdout('Reiniciando comunicação realtime...\n');
        return port.close()
            .catch(() => null)
            .then(() => this._sleep(1200))
            .then(() => port.open(this._serialOptions))
            .then(() => {
                this._port = port;
                this._portId = portId || this._portId || 'webserial:realtime';
                return null;
            });
    }

    _resetAvrBootloader (port) {
        if (!port.setSignals) {
            return this._sleep(900);
        }
        return port.setSignals({dataTerminalReady: true, requestToSend: true})
            .catch(() => null)
            .then(() => this._sleep(60))
            .then(() => port.setSignals({dataTerminalReady: false, requestToSend: false}).catch(() => null))
            .then(() => this._sleep(120))
            .then(() => port.setSignals({dataTerminalReady: true, requestToSend: true}).catch(() => null))
            .then(() => this._sleep(650));
    }

    _createStk500Session (port) {
        const writer = port.writable.getWriter();
        const reader = port.readable.getReader();
        const readBuffer = [];
        const readByte = (timeoutMs = 1000) => {
            if (readBuffer.length > 0) {
                return Promise.resolve(readBuffer.shift());
            }
            let timeoutId = null;
            return Promise.race([
                reader.read().then(result => {
                    if (result.done || !result.value) {
                        throw new Error('Serial port closed during upload');
                    }
                    for (let i = 0; i < result.value.length; i++) {
                        readBuffer.push(result.value[i]);
                    }
                    return readBuffer.shift();
                }),
                new Promise((resolve, reject) => {
                    timeoutId = window.setTimeout(
                        () => reject(new Error('Timed out waiting for bootloader response')),
                        timeoutMs
                    );
                })
            ]).finally(() => {
                if (timeoutId) window.clearTimeout(timeoutId);
            });
        };
        const write = bytes => {
            if (this._uploadAbort) {
                throw new Error('Upload aborted');
            }
            return writer.write(new Uint8Array(bytes));
        };
        const expectOk = () => readByte()
            .then(insync => {
                if (insync !== 0x14) {
                    throw new Error(`Unexpected bootloader response: 0x${insync.toString(16)}`);
                }
                return readByte();
            })
            .then(ok => {
                if (ok !== 0x10) {
                    throw new Error(`Bootloader command failed: 0x${ok.toString(16)}`);
                }
                return null;
            });
        return {
            write,
            expectOk,
            close: () => {
                try {
                    reader.releaseLock();
                } catch (e) {
                    // Ignore release errors.
                }
                try {
                    writer.releaseLock();
                } catch (e) {
                    // Ignore release errors.
                }
            }
        };
    }

    _syncStk500 (session) {
        const attempt = retries => session.write([0x30, 0x20])
            .then(() => session.expectOk())
            .catch(error => {
                if (retries <= 0) throw error;
                return this._sleep(200).then(() => attempt(retries - 1));
            });
        this._sendUploadStdout('Sincronizando com bootloader...\n');
        return attempt(12);
    }

    _programPages (session, pages) {
        let sequence = Promise.resolve();
        pages.forEach((page, index) => {
            sequence = sequence.then(() => {
                const wordAddress = page.address >> 1;
                const percent = Math.round((index / pages.length) * 100);
                this._sendUploadStdout(`Gravando ${percent}%\n`);
                return session.write([
                    0x55,
                    wordAddress & 0xFF,
                    (wordAddress >> 8) & 0xFF,
                    0x20
                ])
                    .then(() => session.expectOk())
                    .then(() => session.write([
                        0x64,
                        (page.data.length >> 8) & 0xFF,
                        page.data.length & 0xFF,
                        0x46
                    ].concat(Array.prototype.slice.call(page.data), [0x20])))
                    .then(() => session.expectOk());
            });
        });
        return sequence.then(() => this._sendUploadStdout('Gravando 100%\n'));
    }

    _leaveProgrammingMode (session) {
        return session.write([0x51, 0x20])
            .then(() => session.expectOk())
            .catch(() => null);
    }

    _hexToPages (hex, pageSize) {
        const bytes = [];
        let upperAddress = 0;
        let highest = 0;
        hex.split(/\r?\n/).forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;
            if (trimmed.charAt(0) !== ':') {
                throw new Error('Invalid Intel HEX file');
            }
            const length = parseInt(trimmed.substr(1, 2), 16);
            const address = parseInt(trimmed.substr(3, 4), 16);
            const type = parseInt(trimmed.substr(7, 2), 16);
            if (type === 0x00) {
                const base = upperAddress + address;
                for (let i = 0; i < length; i++) {
                    const value = parseInt(trimmed.substr(9 + (i * 2), 2), 16);
                    bytes[base + i] = value;
                    highest = Math.max(highest, base + i + 1);
                }
            } else if (type === 0x01) {
                return;
            } else if (type === 0x04) {
                upperAddress = parseInt(trimmed.substr(9, 4), 16) << 16;
            }
        });
        const pages = [];
        const end = Math.ceil(highest / pageSize) * pageSize;
        for (let address = 0; address < end; address += pageSize) {
            const page = new Uint8Array(pageSize);
            for (let i = 0; i < pageSize; i++) {
                page[i] = typeof bytes[address + i] === 'number' ? bytes[address + i] : 0xFF;
            }
            pages.push({address, data: page});
        }
        if (pages.length === 0) {
            throw new Error('No flash data found in compiled artifact');
        }
        return pages;
    }

    _sendUploadStdout (message) {
        this._sendRemoteRequest('uploadStdout', {message});
    }

    _sleep (ms) {
        return new Promise(resolve => window.setTimeout(resolve, ms));
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
