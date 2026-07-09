const Buffer = require('buffer').Buffer;

const Serialport = require('../../io/serialport');

const MICROBIT_REALTIME_TIMEOUT = 2000;
const MICROBIT_REALTIME_CONNECT_TIMEOUT = 9000;
const MICROBIT_REALTIME_RETRY_INTERVAL = 300;
const MICROBIT_REALTIME_POLL_INTERVAL = 200;
const MICROBIT_REALTIME_VERSION = 'microbit-realtime-v2';

const ConnectMicrobitTimeout =
    'Timeout when try to connect micro:bit realtime firmware, please download the firmware first';
const ConnectMicrobitVersionError =
    'Unsupported micro:bit realtime firmware, please download the realtime firmware again';

const Level = {
    High: '1',
    Low: '0'
};

const parseResponseLine = line => {
    const response = String(line || '').trim();
    if (!response) {
        return {
            ok: false,
            code: 'invalid',
            invalid: true
        };
    }

    const match = /^(OK|ERR)(?:\s+(.*))?$/.exec(response);
    if (!match) {
        return {
            ok: false,
            code: 'invalid',
            invalid: true
        };
    }

    return {
        ok: match[1] === 'OK',
        value: match[2] || '',
        code: match[2] || ''
    };
};

/**
 * Manage realtime USB serial communication with a micro:bit running the OpenBlock MicroPython firmware.
 */
class MicrobitRealtimePeripheral{
    /**
     * Construct a micro:bit realtime communication object.
     * @param {Runtime} runtime - the OpenBlock runtime
     * @param {string} deviceId - the id of the peripheral
     * @param {string} originalDeviceId - the original id of the peripheral
     * @param {object} pnpidList - the pnp id of the peripheral
     * @param {object} serialConfig - the serial config of the peripheral
     * @param {object} diveceOpt - the device option of the peripheral
     */
    constructor (runtime, deviceId, originalDeviceId, pnpidList, serialConfig, diveceOpt) {
        this._runtime = runtime;

        this.pnpidList = pnpidList;
        this.serialConfig = serialConfig;
        this.diveceOpt = diveceOpt;

        this._serialport = null;
        this._runtime.registerPeripheralExtension(deviceId, this);
        this._runtime.setRealtimeBaudrate(this.serialConfig.baudRate);

        this._deviceId = deviceId;
        this._originalDeviceId = originalDeviceId;

        this._lineBuffer = '';
        this._activeRequest = null;
        this._requestQueue = [];
        this._isRealtimeConnected = false;
        this._connectTimeoutID = null;
        this._connectRetryTimeoutID = null;
        this._eventPollTimeoutID = null;
        this._isRealtimeConnecting = false;
        this._lastEventState = {
            a: false,
            b: false,
            ab: false,
            t0: false,
            t1: false,
            t2: false,
            gesture: ''
        };

        this.reset = this.reset.bind(this);
        this._onConnect = this._onConnect.bind(this);
        this._onMessage = this._onMessage.bind(this);
        this._handleProgramModeUpdate = this._handleProgramModeUpdate.bind(this);
        this._startRealtime = this._startRealtime.bind(this);

        this._registerRealtimeHats();
    }

    /**
     * Called by the runtime when user wants to upload code to a peripheral.
     * @param {string} code - the code want to upload.
     */
    upload (code) {
        this._stopRealtime();
        const base64Str = Buffer.from(code).toString('base64');
        this._serialport.upload(base64Str, this.diveceOpt, 'base64');
    }

    /**
     * Called by the runtime when user wants to upload realtime firmware to a peripheral.
     */
    uploadFirmware () {
        this._stopRealtime();
        this._serialport.uploadFirmware(this.diveceOpt);
    }

    /**
     * Called by the runtime when user wants to upload a compiled micro:bit HEX artifact.
     * This path only needs the Link socket because the Link copies the HEX to the MICROBIT drive.
     * @param {string} artifact - the HEX artifact.
     * @param {?string} encoding - the artifact encoding.
     * @param {?object} options - upload options.
     * @return {*} upload request result.
     */
    uploadArtifact (artifact, encoding = null, options = null) {
        this._stopRealtime();
        if (!this._serialport) {
            this._serialport = new Serialport(this._runtime, this._originalDeviceId, {
                filters: {
                    pnpid: this.pnpidList
                },
                skipInitialDiscover: true
            }, this._onConnect, this.reset);
        }
        const artifactText = encoding ? Buffer.from(artifact, encoding).toString() : artifact;
        const base64Str = Buffer.from(artifactText).toString('base64');
        const uploadOptions = Object.assign({artifactType: 'microbitHex'}, options || {});
        return this._serialport.upload(base64Str, this.diveceOpt, 'base64', uploadOptions);
    }

    /**
     * Called by the runtime when user wants to abort the uploading process.
     */
    abortUpload () {
        this._serialport.abortUpload();
    }

    /**
     * Called by the runtime when user wants to scan for a peripheral.
     * @param {Array.<string>} pnpidList - the array of pnp id list
     * @param {bool} listAll - wether list all connectable device
     */
    scan (pnpidList, listAll) {
        if (this._serialport) {
            this._serialport.disconnect();
        }
        this._serialport = new Serialport(this._runtime, this._originalDeviceId, {
            filters: {
                pnpid: listAll ? ['*'] : (pnpidList ? pnpidList : this.pnpidList)
            }
        }, this._onConnect, this.reset);
    }

    /**
     * Called by the runtime when user wants to connect to a certain peripheral.
     * @param {number} id - the id of the peripheral to connect to.
     * @param {?number} baudrate - the baudrate.
     */
    connect (id, baudrate = null) {
        const config = Object.assign({}, this.serialConfig);
        if (baudrate) {
            config.baudRate = baudrate;
        }
        if (this._serialport) {
            this._serialport.connectPeripheral(id, {config: config});
        }
    }

    /**
     * Disconnect from the peripheral.
     */
    disconnect () {
        if (this._serialport) {
            this._serialport.disconnect();
        }

        this.reset();
    }

    /**
     * Reset all state and listeners.
     */
    reset () {
        this._stopRealtime();
        this._runtime.removeListener(this._runtime.constructor.PROGRAM_MODE_UPDATE, this._handleProgramModeUpdate);
        this._runtime.removeListener(this._runtime.constructor.PERIPHERAL_UPLOAD_SUCCESS, this._startRealtime);
    }

    /**
     * Return true if connected to the peripheral.
     * @return {boolean} - whether the peripheral is connected.
     */
    isConnected () {
        let connected = false;
        if (this._serialport) {
            connected = this._serialport.isConnected();
        }
        return connected;
    }

    /**
     * Set baudrate of the peripheral serialport.
     * @param {number} baudrate - the baudrate.
     */
    setBaudrate (baudrate) {
        this._serialport.setBaudrate(baudrate);
    }

    /**
     * Write data to the peripheral serialport.
     * @param {string} data - the data to write.
     */
    write (data) {
        if (!this.isConnected()) return;

        const base64Str = Buffer.from(data).toString('base64');
        this._serialport.write(base64Str, 'base64');
    }

    /**
     * Return true if peripheral is ready for realtime mode communication.
     * @return {boolean} - whether the peripheral is ready.
     */
    isReady () {
        return this._runtime.isRealtimeMode() && this._isRealtimeConnected;
    }

    /**
     * Set pin digital out level.
     * @param {PIN} pin - the pin to set.
     * @param {LEVEL} level - the pin level to set.
     * @return {Promise} - a Promise that resolves when write finishes.
     */
    setDigitalOutput (pin, level) {
        level = level === Level.High ? 1 : 0;
        return this._request(`DWRITE ${this.parsePin(pin)} ${level}`, false, value => value === '1');
    }

    /**
     * Set pin pwm out value.
     * @param {PIN} pin - the pin to set.
     * @param {VALUE} value - the pwm value to set.
     * @return {Promise} - a Promise that resolves when write finishes.
     */
    setPwmOutput (pin, value) {
        value = this._clampNumber(value, 0, 1023);
        return this._request(`PWM ${this.parsePin(pin)} ${value}`, false, response => response === '1');
    }

    /**
     * Read pin digital level.
     * @param {PIN} pin - the pin to read.
     * @return {Promise} - a Promise that resolves to true for high level.
     */
    readDigitalPin (pin) {
        return this._request(`DREAD ${this.parsePin(pin)}`, false, value => Number(value) === 1);
    }

    /**
     * Read analog pin.
     * @param {PIN} pin - the pin to read.
     * @return {Promise} - a Promise that resolves to 0..1023.
     */
    readAnalogPin (pin) {
        return this._request(`AREAD ${this.parsePin(pin)}`, '', value => {
            const number = Number(value);
            return Number.isNaN(number) ? '' : number;
        });
    }

    /**
     * Read touch state from a capacitive pin.
     * @param {PIN} pin - the pin to read.
     * @return {Promise} - a Promise that resolves to true if touched.
     */
    pinTouched (pin) {
        return this._request(`TOUCH ${this.parsePin(pin)}`, false, value => Number(value) === 1);
    }

    /**
     * Read button state.
     * @param {KEY} key - button A or B.
     * @return {Promise} - a Promise that resolves to true if pressed.
     */
    buttonIsPressed (key) {
        return this._request(`BTN ${String(key).toUpperCase()}`, false, value => Number(value) === 1);
    }

    /**
     * Read gesture state.
     * @param {GESTURE} gesture - gesture name.
     * @return {Promise} - a Promise that resolves to true if gesture matches.
     */
    gestureIsX (gesture) {
        return this._request(`GEST ${this._normalizeGesture(gesture)}`, false, value => Number(value) === 1);
    }

    /**
     * Read accelerometer axis.
     * @param {AXIS} axis - axis name.
     * @return {Promise} - a Promise that resolves to acceleration value.
     */
    axisAcceleration (axis) {
        return this._request(`ACC ${String(axis).toUpperCase()}`, '', value => {
            const number = Number(value);
            return Number.isNaN(number) ? '' : number;
        });
    }

    /**
     * Read display light level.
     * @return {Promise} - a Promise that resolves to 0..255.
     */
    lightLevel () {
        return this._request('LIGHT', '', value => {
            const number = Number(value);
            return Number.isNaN(number) ? '' : number;
        });
    }

    /**
     * Read temperature.
     * @return {Promise} - a Promise that resolves to celsius temperature.
     */
    temperature () {
        return this._request('TEMP', '', value => {
            const number = Number(value);
            return Number.isNaN(number) ? '' : number;
        });
    }

    /**
     * Read running time.
     * @return {Promise} - a Promise that resolves to milliseconds since start.
     */
    runningTime () {
        return this._request('TIME', '', value => {
            const number = Number(value);
            return Number.isNaN(number) ? '' : number;
        });
    }

    /**
     * Show a 5x5 image on the micro:bit display.
     * @param {string} value - 25 character matrix string.
     * @return {Promise} - a Promise that resolves when the image is sent.
     */
    showImage (value) {
        value = String(value || '').replace(/[^01]/g, '');
        if (value.length !== 25) {
            return Promise.resolve(false);
        }
        return this._request(`IMG ${value}`, false, response => response === '1');
    }

    /**
     * Scroll text on the micro:bit display.
     * @param {string} text - text to scroll.
     * @param {boolean} wait - whether firmware should wait until scroll completes.
     * @return {Promise} - a Promise that resolves when the command is accepted.
     */
    showText (text, wait = false) {
        const hexText = Buffer.from(String(text || ''), 'utf8').toString('hex');
        return this._request(`${wait ? 'TEXTWAIT' : 'TEXT'} ${hexText}`, false, response => response === '1');
    }

    /**
     * Set a display pixel brightness.
     * @param {number} x - x coordinate.
     * @param {number} y - y coordinate.
     * @param {number} brightness - brightness 0..9.
     * @return {Promise} - a Promise that resolves when the command is accepted.
     */
    setPixel (x, y, brightness) {
        x = this._clampNumber(x, 0, 4);
        y = this._clampNumber(y, 0, 4);
        brightness = this._clampNumber(brightness, 0, 9);
        return this._request(`PIXEL ${x} ${y} ${brightness}`, false, response => response === '1');
    }

    /**
     * Clear the micro:bit display.
     * @return {Promise} - a Promise that resolves when the display is cleared.
     */
    clearDisplay () {
        return this._request('CLEAR', false, response => response === '1');
    }

    /**
     * @param {PIN} pin - the pin string to parse.
     * @return {number} - the pin number.
     */
    parsePin (pin) {
        if (String(pin).charAt(0)
            .toUpperCase() === 'P') {
            return parseInt(String(pin).slice(1), 10);
        }
        return parseInt(pin, 10);
    }

    /**
     * Starts reading data from peripheral after serialport has connected to it.
     * @private
     */
    _onConnect () {
        this._serialport.read(this._onMessage);

        this._startRealtime();

        this._runtime.on(this._runtime.constructor.PROGRAM_MODE_UPDATE, this._handleProgramModeUpdate);
        this._runtime.on(this._runtime.constructor.PERIPHERAL_UPLOAD_SUCCESS, this._startRealtime);
    }

    /**
     * Process incoming serialport data.
     * @param {object} base64 - the incoming serialport data.
     * @private
     */
    _onMessage (base64) {
        if (this._runtime.isRealtimeMode()) {
            this._lineBuffer += Buffer.from(base64, 'base64').toString();

            const lines = this._lineBuffer.split('\n');
            this._lineBuffer = lines.pop();
            lines.forEach(line => this._handleResponseLine(line.replace(/\r/g, '').trim()));
        } else {
            const consoleData = Buffer.from(base64, 'base64');
            this._runtime.emit(this._runtime.constructor.PERIPHERAL_RECIVE_DATA, consoleData);
        }
    }

    /**
     * Start realtime protocol handshake.
     * @private
     */
    _startRealtime () {
        if (!this._runtime.isRealtimeMode() || !this.isConnected()) {
            return;
        }

        this._stopRealtime();
        this._isRealtimeConnecting = true;
        this._connectTimeoutID = window.setTimeout(() => {
            this._isRealtimeConnecting = false;
            this._stopRealtime();
            if (this._runtime.isRealtimeMode() && this.isConnected()) {
                this._serialport.handleRealtimeDisconnectError(ConnectMicrobitTimeout);
            }
        }, MICROBIT_REALTIME_CONNECT_TIMEOUT);
        this._pingUntilReady();
    }

    /**
     * Stop realtime protocol state and resolve pending requests with fallbacks.
     * @private
     */
    _stopRealtime () {
        this._isRealtimeConnected = false;
        this._isRealtimeConnecting = false;
        this._lineBuffer = '';
        if (this._connectTimeoutID) {
            window.clearTimeout(this._connectTimeoutID);
            this._connectTimeoutID = null;
        }
        if (this._connectRetryTimeoutID) {
            window.clearTimeout(this._connectRetryTimeoutID);
            this._connectRetryTimeoutID = null;
        }
        if (this._eventPollTimeoutID) {
            window.clearTimeout(this._eventPollTimeoutID);
            this._eventPollTimeoutID = null;
        }
        this._clearActiveRequest();

        while (this._requestQueue.length > 0) {
            const request = this._requestQueue.shift();
            request.resolve(request.fallback);
        }
    }

    /**
     * Handle the program mode update event.
     * @private
     */
    _handleProgramModeUpdate () {
        if (this._runtime.isRealtimeMode()) {
            this._startRealtime();
        } else {
            this._stopRealtime();
        }
    }

    /**
     * Queue a command to the realtime firmware.
     * @param {string} command - command line without newline.
     * @param {*} fallback - value returned when unavailable or timed out.
     * @param {Function} parser - parser for OK value.
     * @param {boolean} allowBeforeReady - true to allow handshake commands before ready state.
     * @return {Promise} - a Promise that resolves to parsed response or fallback.
     * @private
     */
    _request (command, fallback, parser, allowBeforeReady = false) {
        if (!this._runtime.isRealtimeMode() || !this.isConnected() ||
            (!allowBeforeReady && !this._isRealtimeConnected)) {
            return Promise.resolve(fallback);
        }

        return new Promise(resolve => {
            this._requestQueue.push({
                command: command,
                fallback: fallback,
                parser: parser,
                resolve: resolve,
                timeoutId: null
            });
            this._drainRequestQueue();
        });
    }

    /**
     * Register micro:bit event hats.
     * @private
     */
    _registerRealtimeHats () {
        [
            'event_whenmicrobitbegin',
            'event_whenmicrobitbuttonpressed',
            'event_whenmicrobitpinbeingtouched',
            'event_whenmicrobitgesture',
            'microbit_whenMicrobitBegin',
            'microbit_whenButtonPressed',
            'microbit_whenPinTouched',
            'microbit_whenGesture',
            'microbit_microbit_whenMicrobitBegin',
            'microbit_microbit_whenButtonPressed',
            'microbit_microbit_whenPinTouched',
            'microbit_microbit_whenGesture'
        ].forEach(opcode => {
            this._runtime._hats[opcode] = {
                edgeActivated: false,
                restartExistingThreads: false
            };
        });
    }

    /**
     * Start polling hardware events.
     * @private
     */
    _startEventPolling () {
        if (this._eventPollTimeoutID) {
            return;
        }
        this._scheduleNextPoll();
    }

    /**
     * Schedule the next realtime event poll.
     * @private
     */
    _scheduleNextPoll () {
        if (!this.isReady() || this._eventPollTimeoutID) {
            return;
        }
        this._eventPollTimeoutID = window.setTimeout(() => {
            this._eventPollTimeoutID = null;
            this._pollEvents();
        }, MICROBIT_REALTIME_POLL_INTERVAL);
    }

    /**
     * Poll hardware state only when the serial queue is free.
     * @private
     */
    _pollEvents () {
        if (!this.isReady()) {
            return;
        }
        if (this._activeRequest || this._requestQueue.length > 0) {
            this._scheduleNextPoll();
            return;
        }
        this._request('POLL', '', value => value)
            .then(value => {
                this._handlePollEvent(value);
                this._scheduleNextPoll();
            });
    }

    /**
     * Handle one event poll response.
     * @param {string} value - poll response.
     * @private
     */
    _handlePollEvent (value) {
        if (!value) {
            return;
        }
        const parts = String(value).split(',');
        if (parts.length < 7) {
            return;
        }
        const state = {
            a: parts[0] === '1',
            b: parts[1] === '1',
            ab: parts[2] === '1',
            t0: parts[3] === '1',
            t1: parts[4] === '1',
            t2: parts[5] === '1',
            gesture: this._normalizeGesture(parts[6])
        };

        this._triggerMicrobitButtonHats('a', state.a);
        this._triggerMicrobitButtonHats('b', state.b);
        this._triggerOnRising('event_whenmicrobitbuttonpressed', 'KEY_OPTION', 'ab', state.ab);
        this._triggerOnRising('event_whenmicrobitpinbeingtouched', 'PIN_OPTION', '0', state.t0);
        this._triggerOnRising('event_whenmicrobitpinbeingtouched', 'PIN_OPTION', '1', state.t1);
        this._triggerOnRising('event_whenmicrobitpinbeingtouched', 'PIN_OPTION', '2', state.t2);
        this._triggerOnRising('microbit_whenPinTouched', 'PIN', '0', state.t0);
        this._triggerOnRising('microbit_whenPinTouched', 'PIN', '1', state.t1);
        this._triggerOnRising('microbit_whenPinTouched', 'PIN', '2', state.t2);
        this._triggerOnRising('microbit_microbit_whenPinTouched', 'PIN', '0', state.t0);
        this._triggerOnRising('microbit_microbit_whenPinTouched', 'PIN', '1', state.t1);
        this._triggerOnRising('microbit_microbit_whenPinTouched', 'PIN', '2', state.t2);

        if (state.gesture && state.gesture !== this._lastEventState.gesture) {
            this._runtime.startHats('event_whenmicrobitgesture', {
                GESTURE_OPTION: state.gesture
            });
            this._runtime.startHats('microbit_whenGesture', {
                STA: state.gesture
            });
            this._runtime.startHats('microbit_microbit_whenGesture', {
                STA: state.gesture
            });
        }

        this._lastEventState = state;
    }

    /**
     * Trigger a hat only when the value changes from false to true.
     * @param {string} opcode - hat opcode.
     * @param {string} field - field name.
     * @param {string} value - field value.
     * @param {boolean} current - current state.
     * @private
     */
    _triggerOnRising (opcode, field, value, current) {
        const stateKey = field === 'PIN_OPTION' || field === 'PIN' ? `t${value}` : value;
        const previous = this._lastEventState[stateKey] || false;
        if (current && !previous) {
            const fields = {};
            fields[field] = value;
            this._runtime.startHats(opcode, fields);
        }
    }

    /**
     * Trigger button hats in every micro:bit block format currently supported.
     * The native device uses KEY=a/b, old projects/extensions use BTN=A/B, and
     * legacy OpenBlock event blocks use KEY_OPTION=a/b.
     * @param {string} key - lowercase button key.
     * @param {boolean} current - current pressed state.
     * @private
     */
    _triggerMicrobitButtonHats (key, current) {
        const previous = this._lastEventState[key] || false;
        if (!current || previous) {
            return;
        }
        const upperKey = key.toUpperCase();
        this._runtime.startHats('event_whenmicrobitbuttonpressed', {
            KEY_OPTION: key
        });
        this._runtime.startHats('microbit_whenButtonPressed', {
            KEY: key
        });
        this._runtime.startHats('microbit_whenButtonPressed', {
            BTN: upperKey
        });
        this._runtime.startHats('microbit_microbit_whenButtonPressed', {
            KEY: key
        });
    }

    /**
     * Normalize gesture names between blocks and MicroPython.
     * @param {string} gesture - gesture name.
     * @return {string} - normalized gesture name.
     * @private
     */
    _normalizeGesture (gesture) {
        return String(gesture || '').toLowerCase()
            .replace(/\s/g, '');
    }

    /**
     * Keep sending PING during the startup window. micro:bit may need time after reset/upload.
     * @private
     */
    _pingUntilReady () {
        if (!this._isRealtimeConnecting || !this._runtime.isRealtimeMode() || !this.isConnected()) {
            return;
        }

        this._request('PING', false, value => value === '1', true)
            .then(ok => {
                if (!this._isRealtimeConnecting) {
                    return;
                }
                if (ok) {
                    this._checkRealtimeVersion();
                    return;
                }
                this._connectRetryTimeoutID = window.setTimeout(() => {
                    this._connectRetryTimeoutID = null;
                    this._pingUntilReady();
                }, MICROBIT_REALTIME_RETRY_INTERVAL);
            });
    }

    /**
     * Validate that the connected board is running the current realtime firmware.
     * @private
     */
    _checkRealtimeVersion () {
        this._request('VER', false, value => value === MICROBIT_REALTIME_VERSION, true)
            .then(ok => {
                if (!this._isRealtimeConnecting) {
                    return;
                }
                if (!ok) {
                    this._isRealtimeConnecting = false;
                    this._stopRealtime();
                    if (this._runtime.isRealtimeMode() && this.isConnected()) {
                        this._serialport.handleRealtimeDisconnectError(ConnectMicrobitVersionError);
                    }
                    return;
                }
                this._isRealtimeConnecting = false;
                if (this._connectTimeoutID) {
                    window.clearTimeout(this._connectTimeoutID);
                    this._connectTimeoutID = null;
                }
                this._isRealtimeConnected = true;
                this._serialport.handleRealtimeConnectSucess();
                this._runtime.startHats('event_whenmicrobitbegin');
                this._runtime.startHats('microbit_whenMicrobitBegin');
                this._runtime.startHats('microbit_microbit_whenMicrobitBegin');
                this._startEventPolling();
            });
    }

    /**
     * Send the next queued command.
     * @private
     */
    _drainRequestQueue () {
        if (this._activeRequest || this._requestQueue.length < 1) {
            return;
        }

        this._activeRequest = this._requestQueue.shift();
        this._activeRequest.timeoutId = window.setTimeout(() => {
            const request = this._activeRequest;
            this._activeRequest = null;
            request.resolve(request.fallback);
            this._drainRequestQueue();
        }, MICROBIT_REALTIME_TIMEOUT);

        this.write(`${this._activeRequest.command}\n`);
    }

    /**
     * Handle one response line from the realtime firmware.
     * @param {string} line - response line.
     * @private
     */
    _handleResponseLine (line) {
        const response = parseResponseLine(line);
        if (!this._activeRequest || response.invalid) {
            return;
        }

        const request = this._activeRequest;
        this._activeRequest = null;
        if (request.timeoutId) {
            window.clearTimeout(request.timeoutId);
        }

        if (response.ok) {
            request.resolve(request.parser(response.value));
        } else {
            request.resolve(request.fallback);
        }
        this._drainRequestQueue();
    }

    /**
     * Clear the active request, if any.
     * @private
     */
    _clearActiveRequest () {
        if (!this._activeRequest) {
            return;
        }
        if (this._activeRequest.timeoutId) {
            window.clearTimeout(this._activeRequest.timeoutId);
        }
        this._activeRequest.resolve(this._activeRequest.fallback);
        this._activeRequest = null;
    }

    /**
     * Clamp numeric values.
     * @param {*} value - value to clamp.
     * @param {number} min - minimum value.
     * @param {number} max - maximum value.
     * @return {number} - clamped number.
     * @private
     */
    _clampNumber (value, min, max) {
        value = parseInt(value, 10);
        if (Number.isNaN(value)) {
            value = min;
        }
        if (value < min) {
            return min;
        }
        if (value > max) {
            return max;
        }
        return value;
    }
}

MicrobitRealtimePeripheral.parseResponseLine = parseResponseLine;

module.exports = MicrobitRealtimePeripheral;
