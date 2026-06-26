/**
 * ScratchLinkSocket-compatible transport backed by the browser Web Bluetooth API.
 * This is intentionally limited to the Scratch micro:bit BLE service used by
 * the microbitBle extension.
 */
class ScratchLinkWebBluetooth {
    constructor (type) {
        this._type = type;
        this._onOpen = null;
        this._onClose = null;
        this._onError = null;
        this._handleMessage = null;

        this._isOpen = false;
        this._devices = {};
        this._device = null;
        this._server = null;
        this._services = {};
        this._characteristics = {};
        this._notificationListeners = {};
    }

    static isSupported (type) {
        if (type !== 'WEB_BLUETOOTH') return false;
        return typeof navigator !== 'undefined' && Boolean(navigator.bluetooth);
    }

    open () {
        if (this._type !== 'WEB_BLUETOOTH') {
            throw new Error(`Unknown Web Bluetooth socket Type: ${this._type}`);
        }
        if (!ScratchLinkWebBluetooth.isSupported(this._type)) {
            throw new Error('Web Bluetooth is not available in this browser');
        }
        if (this._onOpen && this._onClose && this._onError && this._handleMessage) {
            this._isOpen = true;
            this._onOpen();
        } else {
            throw new Error('Must set open, close, message and error handlers before calling open on the socket');
        }
    }

    close () {
        this._disconnect();
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
            return this._disconnect();
        case 'read':
            return this._read(params);
        case 'startNotifications':
            return this._startNotifications(params);
        case 'write':
            return this._write(params);
        case 'uploadFirmware':
            this._sendRemoteRequest('uploadError', {
                message: 'Firmware upload is not available with Web Bluetooth. Use OpenBlock Link to send firmware.'
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

    _discover (params) {
        this._devices = {};
        if (navigator.userActivation && !navigator.userActivation.isActive) {
            return null;
        }
        return navigator.bluetooth.requestDevice(this._makeRequestOptions(params))
            .then(device => {
                this._reportDevice(device);
                this._sendRemoteRequest('userDidPickPeripheral', {
                    peripheralId: this._getDeviceId(device),
                    name: device.name || 'BBC micro:bit'
                });
                return null;
            })
            .catch(error => {
                if (error && error.name === 'NotFoundError') {
                    this._sendRemoteRequest('userDidNotPickPeripheral', null);
                    return null;
                }
                throw error;
            });
    }

    _makeRequestOptions (params) {
        const services = this._normalizeServicesFromFilters(params.filters);
        return {
            filters: [
                {namePrefix: 'BBC micro:bit'},
                {namePrefix: 'micro:bit'},
                {services: services}
            ],
            optionalServices: services
        };
    }

    _normalizeServicesFromFilters (filters) {
        const services = [];
        (filters || []).forEach(filter => {
            (filter.services || []).forEach(service => {
                if (services.indexOf(service) === -1) {
                    services.push(service);
                }
            });
        });
        return services.length > 0 ? services : [0xf005];
    }

    _reportDevice (device) {
        const id = this._getDeviceId(device);
        this._devices[id] = device;
        this._sendRemoteRequest('didDiscoverPeripheral', {
            peripheralId: id,
            name: device.name || 'BBC micro:bit'
        });
    }

    _getDeviceId (device) {
        return `webbluetooth:${device.id || 'microbit'}`;
    }

    _connect (params) {
        const device = this._devices[params.peripheralId];
        if (!device) {
            throw new Error(`invalid peripheral ID: ${params.peripheralId}`);
        }
        this._device = device;
        this._device.addEventListener('gattserverdisconnected', this._handleDisconnected.bind(this));
        return this._device.gatt.connect()
            .then(server => {
                this._server = server;
                return null;
            });
    }

    _disconnect () {
        this._characteristics = {};
        this._notificationListeners = {};
        this._services = {};
        this._server = null;
        if (this._device && this._device.gatt && this._device.gatt.connected) {
            this._device.gatt.disconnect();
        }
        this._device = null;
        return null;
    }

    _read (params) {
        if (params.startNotifications) {
            return this._startNotifications(params);
        }
        return this._getCharacteristic(params.serviceId, params.characteristicId)
            .then(characteristic => characteristic.readValue()
                .then(value => {
                    const bytes = new Uint8Array(value.buffer.slice(
                        value.byteOffset,
                        value.byteOffset + value.byteLength
                    ));
                    return this._toBase64(bytes);
                }));
    }

    _startNotifications (params) {
        return this._getCharacteristic(params.serviceId, params.characteristicId)
            .then(characteristic => {
                const characteristicKey = `${params.serviceId}:${params.characteristicId}`;
                if (this._notificationListeners[characteristicKey]) {
                    characteristic.removeEventListener(
                        'characteristicvaluechanged',
                        this._notificationListeners[characteristicKey]
                    );
                }
                const listener = event => {
                    const value = event.target.value;
                    const bytes = new Uint8Array(value.buffer.slice(
                        value.byteOffset,
                        value.byteOffset + value.byteLength
                    ));
                    this._sendRemoteRequest('characteristicDidChange', {
                        encoding: 'base64',
                        message: this._toBase64(bytes)
                    });
                };
                this._notificationListeners[characteristicKey] = listener;
                characteristic.addEventListener('characteristicvaluechanged', listener);
                return characteristic.startNotifications()
                    .then(() => {
                        if (!characteristic.properties || !characteristic.properties.read) {
                            return null;
                        }
                        return characteristic.readValue()
                            .then(value => {
                                const bytes = new Uint8Array(value.buffer.slice(
                                    value.byteOffset,
                                    value.byteOffset + value.byteLength
                                ));
                                if (bytes.length) {
                                    this._sendRemoteRequest('characteristicDidChange', {
                                        encoding: 'base64',
                                        message: this._toBase64(bytes)
                                    });
                                }
                                return null;
                            })
                            .catch(() => null);
                    });
            });
    }

    _write (params) {
        return this._getCharacteristic(params.serviceId, params.characteristicId)
            .then(characteristic => {
                const bytes = this._decodeMessage(params.message, params.encoding);
                if (params.withResponse && characteristic.writeValueWithResponse) {
                    return characteristic.writeValueWithResponse(bytes).then(() => null);
                }
                if (!params.withResponse && characteristic.writeValueWithoutResponse) {
                    return characteristic.writeValueWithoutResponse(bytes).then(() => null);
                }
                return characteristic.writeValue(bytes).then(() => null);
            });
    }

    _getCharacteristic (serviceId, characteristicId) {
        if (!this._server) {
            throw new Error('Web Bluetooth device is not connected');
        }
        const serviceKey = String(serviceId);
        const characteristicKey = `${serviceKey}:${characteristicId}`;
        if (this._characteristics[characteristicKey]) {
            return Promise.resolve(this._characteristics[characteristicKey]);
        }
        const servicePromise = this._services[serviceKey] ?
            Promise.resolve(this._services[serviceKey]) :
            this._server.getPrimaryService(serviceId).then(service => {
                this._services[serviceKey] = service;
                return service;
            });
        return servicePromise
            .then(service => service.getCharacteristic(characteristicId))
            .then(characteristic => {
                this._characteristics[characteristicKey] = characteristic;
                return characteristic;
            });
    }

    _handleDisconnected () {
        this._isOpen = false;
        this._sendRemoteRequest('peripheralUnplug', null);
        if (this._onClose) {
            this._onClose();
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

module.exports = ScratchLinkWebBluetooth;
