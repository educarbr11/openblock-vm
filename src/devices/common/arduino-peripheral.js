const formatMessage = require('format-message');
const Buffer = require('buffer').Buffer;

const Serialport = require('../../io/serialport');
const Base64Util = require('../../util/base64-util');

const Firmata = require('../../lib/firmata/firmata');

/**
 * A string to report connect firmata timeout.
 * @type {formatMessage}
 */
const ConnectFirmataTimeout = formatMessage({
    id: 'arduinoPeripheral.connection.connectFirmataTimeout',
    default: 'Nao foi possivel iniciar a comunicacao com o Arduino. Envie o firmware novamente para usar o modo palco.',
    description: 'label for connect firmata timeout'
});

/**
 * A time interval to send firmata heartbeat(in milliseconds).
 */
const FrimataHeartbeatInterval = 1000;

/**
 * A time interval to wait (in milliseconds) before reporting to the serialport socket
 * that heartbeat has stopped coming from the peripheral.
 */
const FrimataHeartbeatTimeout = 2200;

/**
 * Web Serial runs through the browser event loop and can briefly stall while
 * Chrome handles USB reads/writes, especially after an Arduino reset.
 */
const WebSerialFirmataHeartbeatTimeout = 6000;

/**
 * A time interval wait (in milliseconds) before reporting to the serialport socket
 * that firmata still hasn't received the ready event.
 */
const FirmataReadyTimeout = 6500;

/**
 * Web Serial opening usually resets Uno/Nano. Give Firmata more time to boot
 * before reporting that realtime firmware is missing.
 */
const WebSerialFirmataReadyTimeout = 12000;

/**
 * A time interval to wait deivce report data.
 */
const FrimataReadTimeout = 2000;

const Level = {
    High: 'HIGH',
    Low: 'LOW'
};

const Mode = {
    Input: 'INPUT',
    Output: 'OUTPUT',
    InputPullup: 'INPUT_PULLUP'
};

/**
 * Manage communication with a Arduino peripheral over a OpenBlock Link client socket.
 */
class ArduinoPeripheral{

    /**
     * Construct a Arduino communication object.
     * @param {Runtime} runtime - the OpenBlock runtime
     * @param {string} deviceId - the id of the peripheral
     * @param {string} originalDeviceId - the original id of the peripheral, like xxx_arduinoUno
     * @param {object} pnpidList - the pnp id of the peripheral
     * @param {object} serialConfig - the serial config of the peripheral
     * @param {object} diveceOpt - the device optione of the peripheral
     */
    constructor (runtime, deviceId, originalDeviceId, pnpidList, serialConfig, diveceOpt) {
        /**
         * The OpenBlock runtime used to trigger the green flag button.
         * @type {Runtime}
         * @private
         */
        this._runtime = runtime;

        this.pnpidList = pnpidList;
        this.serialConfig = serialConfig;
        this.diveceOpt = diveceOpt;

        /**
         * The serialport connection socket for reading/writing peripheral data.
         * @type {SERIALPORT}
         * @private
         */
        this._serialport = null;
        this._runtime.registerPeripheralExtension(deviceId, this);
        this._runtime.setRealtimeBaudrate(this.serialConfig.baudRate);
        this._connectionType = 'link';
        this._writeQueue = Promise.resolve();
        this._configuredServoPins = {};

        /**
         * The id of the peripheral this peripheral belongs to.
         */
        this._deviceId = deviceId;

        this._originalDeviceId = originalDeviceId;

        /**
        * Pending data list. If busy is set when send, the data will push into this array to
        * waitting to be sended.
        */
        this._pendingData = [];

        this.reset = this.reset.bind(this);
        this._onConnect = this._onConnect.bind(this);
        this._onMessage = this._onMessage.bind(this);

        /**
         * Firmata connection.
         * @type {?Firmata}
         * @private
         */
        this._firmata = null;

        /**
         * Timeout ID for firmata get heartbeat timeout.
         * @type {number}
         * @private
         */
        this._firmataTimeoutID = null;

        /**
         * Timeout ID for firmata get ready event timeout.
         * @type {number}
         * @private
         */
        this._firmataReadyTimeoutID = null;

        /**
         * Interval ID for firmata send heartbeat.
         * @type {number}
         * @private
         */
        this._firmataIntervelID = null;

        /**
         * A flag that is true while firmata is conncted.
         * @type {boolean}
         * @private
         */
        this._isFirmataConnected = false;

        this._startHeartbeat = this._startHeartbeat.bind(this);
        this._listenHeartbeat = this._listenHeartbeat.bind(this);
        this._handleProgramModeUpdate = this._handleProgramModeUpdate.bind(this);
        this._resumeRealtimeCommunication = this._resumeRealtimeCommunication.bind(this);
    }

    /**
     * Clear pending Firmata ready timeout.
     * @private
     */
    _clearFirmataReadyTimeout () {
        if (this._firmataReadyTimeoutID) {
            window.clearTimeout(this._firmataReadyTimeoutID);
            this._firmataReadyTimeoutID = null;
        }
    }

    /**
     * Dispose Firmata parser/listeners without closing the serial connection.
     * @private
     */
    _disposeFirmata () {
        if (this._firmata) {
            this._firmata.removeAllListeners('reportversion');
            this._firmata.removeAllListeners('ready');
            delete this._firmata;
        }
        this._configuredServoPins = {};
        this._clearFirmataReadyTimeout();
        this._stopHeartbeat();
    }

    /**
     * Stop Web Serial read loop without treating it as a physical disconnect.
     * @private
     */
    _stopSerialRead () {
        if (this._serialport && this._serialport.stopRead) {
            this._serialport.stopRead();
        }
    }

    /**
     * Called by the runtime when user wants to upload code to a peripheral.
     * @param {string} code - the code want to upload.
     */
    upload (code) {
        // Delete curent firmata. Otherwise, after uploading a new program in upload mode,
        // when returning to real time mode, since the old fimata service still exists,
        // an RealtimeDisconnectErrorerror will be reported quickly.
        this._disposeFirmata();

        const base64Str = Buffer.from(code).toString('base64');
        return this._serialport.upload(base64Str, this.diveceOpt, 'base64');
    }

    /**
     * Called by the runtime when user wants to upload a compiled artifact.
     * @param {string} artifact - the compiled artifact to upload.
     * @param {?string} encoding - the artifact encoding type.
     * @param {?object} options - upload options.
     */
    uploadArtifact (artifact, encoding = null, options = null) {
        this._disposeFirmata();

        const uploadOptions = Object.assign({artifactType: 'compiledArtifact'}, options || {});
        return this._serialport.upload(artifact, this.diveceOpt, encoding, uploadOptions);
    }

    /**
     * Called by the runtime when user wants to upload realtime firmware to a peripheral.
     */
    uploadFirmware () {
        this._disposeFirmata();
        this._serialport.uploadFirmware(this.diveceOpt);
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
     * @param {string} connectionType - the connection transport type
     */
    scan (pnpidList, listAll, connectionType = 'link') {
        if (this._serialport) {
            this._serialport.disconnect();
        }
        this._connectionType = connectionType;
        this._serialport = new Serialport(this._runtime, this._originalDeviceId, {
            connectionType,
            deviceId: this._deviceId,
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
     * Reset all the state and timeout/interval ids.
     */
    reset () {
        this._disposeFirmata();
        this._runtime.removeListener(this._runtime.constructor.PROGRAM_MODE_UPDATE, this._handleProgramModeUpdate);
        this._runtime.removeListener(
            this._runtime.constructor.PERIPHERAL_UPLOAD_SUCCESS,
            this._resumeRealtimeCommunication
        );
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
        this._writeSerial(base64Str, 'base64');
    }

    /**
     * Send a message to the peripheral Serialport socket.
     * @param {Uint8Array} message - the message to write
     */
    send (message) {
        if (!this.isConnected()) return;

        const data = Base64Util.uint8ArrayToBase64(message);
        this._writeSerial(data, 'base64');
    }

    /**
     * Queue Web Serial writes so multi-packet Firmata commands keep order.
     * @param {string} data - Base64 encoded serial data.
     * @param {string} encoding - Encoding name.
     * @private
     */
    _writeSerial (data, encoding) {
        if (this._connectionType !== 'webSerial') {
            this._serialport.write(data, encoding);
            return;
        }
        this._writeQueue = this._writeQueue
            .catch(() => null)
            .then(() => this._serialport.write(data, encoding))
            .catch(() => null);
    }

    /**
     * Start send/recive heartbeat timer.
     * @private
     */
    _startHeartbeat () {
        if (this._runtime.isRealtimeMode()) {
            const heartbeatTimeout = this._connectionType === 'webSerial' ?
                WebSerialFirmataHeartbeatTimeout : FrimataHeartbeatTimeout;
            const readyTimeout = this._connectionType === 'webSerial' ?
                WebSerialFirmataReadyTimeout : FirmataReadyTimeout;
            // eslint-disable-next-line no-negated-condition
            if (!this._firmata) {
                // Start a timeout to report that firmata did not receive the ready event.
                // This happens after connecting to a device that is not running the firmata service.
                this._firmataReadyTimeoutID = window.setTimeout(() => {
                    if (!this._runtime.isRealtimeMode()) return;
                    this._serialport.handleRealtimeDisconnectError(ConnectFirmataTimeout);
                }, readyTimeout);

                this._firmata = new Firmata(this.send.bind(this));
                this._firmata.once('ready', () => {
                    if (this._firmataReadyTimeoutID) {
                        window.clearTimeout(this._firmataReadyTimeoutID);
                        this._firmataReadyTimeoutID = null;
                    }

                    // Receiving a ready event indicates that the firmata service has been initialized.
                    this._isFirmataConnected = true;
                    this._serialport.handleRealtimeConnectSucess();

                    // Start the heartbeat listener.
                    this._firmata.on('reportversion', this._listenHeartbeat);

                    this._firmataIntervelID = window.setInterval(() => {
                        // Send reportVersion request as heartbeat.
                        this._firmata.reportVersion(() => { });
                    }, FrimataHeartbeatInterval);

                    // Start a timer if heartbeat timeout means failed to connect firmata.
                    this._firmataTimeoutID = window.setTimeout(() => {
                        if (!this._runtime.isRealtimeMode()) return;
                        this._isFirmataConnected = false;
                        this._serialport.handleRealtimeDisconnectError(ConnectFirmataTimeout);
                    }, heartbeatTimeout);
                });
            } else {
                this._stopHeartbeat();

                this._firmataIntervelID = window.setInterval(() => {
                    // Send reportVersion request as heartbeat.
                    this._firmata.reportVersion(() => { });
                }, FrimataHeartbeatInterval);

                // Start a timer if heartbeat timeout means failed to connect firmata.
                this._firmataTimeoutID = window.setTimeout(() => {
                    if (!this._runtime.isRealtimeMode()) return;
                    this._isFirmataConnected = false;
                    this._serialport.handleRealtimeDisconnectError(ConnectFirmataTimeout);
                }, heartbeatTimeout);
            }
        }
    }

    /**
     * Stop send/recive heartbeat timer.
     * @private
     */
    _stopHeartbeat () {
        if (this._firmataTimeoutID) {
            window.clearTimeout(this._firmataTimeoutID);
            this._firmataTimeoutID = null;
        }
        if (this._firmataIntervelID) {
            window.clearInterval(this._firmataIntervelID);
            this._firmataIntervelID = null;
        }
        this._isFirmataConnected = false;
    }

    /**
     * Listen the heartbeat and emit connection state event.
     * @private
     */
    _listenHeartbeat () {
        if (!this._runtime.isRealtimeMode()) return;
        if (!this._isFirmataConnected) {
            this._isFirmataConnected = true;
            this._serialport.handleRealtimeConnectSucess();
        }
        // Reset the timeout timer
        window.clearTimeout(this._firmataTimeoutID);
        const heartbeatTimeout = this._connectionType === 'webSerial' ?
            WebSerialFirmataHeartbeatTimeout : FrimataHeartbeatTimeout;
        this._firmataTimeoutID = window.setTimeout(() => {
            if (!this._runtime.isRealtimeMode()) return;
            this._isFirmataConnected = false;
            this._serialport.handleRealtimeDisconnectError(ConnectFirmataTimeout);
        }, heartbeatTimeout);
    }

    /**
     * Handle the program mode update event. If in realtime mode start the heartbeat else stop.
     */
    _handleProgramModeUpdate () {
        if (this._runtime.isRealtimeMode()) {
            this._startHeartbeat();
        } else {
            this._disposeFirmata();
            this._stopSerialRead();
        }
    }

    /**
     * Starts reading data from peripheral after serialport has connected to it.
     * @private
     */
    _onConnect () {
        this._resumeRealtimeCommunication();

        this._runtime.on(this._runtime.constructor.PROGRAM_MODE_UPDATE, this._handleProgramModeUpdate);
        this._runtime.on(this._runtime.constructor.PERIPHERAL_UPLOAD_SUCCESS, this._resumeRealtimeCommunication);
    }

    /**
     * Resume realtime serial reading and Firmata heartbeat after connect/upload.
     * @private
     */
    _resumeRealtimeCommunication (uploadResult = null) {
        if (uploadResult && typeof uploadResult === 'object' &&
                uploadResult.resumeRealtime === false) {
            return;
        }
        this._startHeartbeat();

        this._serialport.read(this._onMessage);
    }

    /**
     * Process the sensor data from the incoming serialport characteristic.
     * @param {object} base64 - the incoming serialport data.
     * @private
     */
    _onMessage (base64) {
        if (this._runtime.isRealtimeMode()) {
            if (!this._firmata) return;
            const data = Base64Util.base64ToUint8Array(base64);
            this._firmata.onReciveData(data);
        } else {
            const consoleData = Buffer.from(base64, 'base64');
            this._runtime.emit(this._runtime.constructor.PERIPHERAL_RECIVE_DATA, consoleData);
        }
    }

    /**
     * Return true if peripheral has connected to firmata and program mode is realtime.
     * @return {boolean} - whether the peripheral is ready for realtime mode communication.
     */
    isReady () {
        if (this._runtime.isRealtimeMode() && this._isFirmataConnected) {
            return true;
        }
        return false;
    }

    /**
     * @param {PIN} pin - the pin string to parse.
     * @return {number} - the pin number.
     */
    parsePin (pin) {
        if (pin.charAt(0) === 'A') {
            return parseInt(pin.slice(1), 10) + this.numDigitalPins;
        }
        return parseInt(pin, 10);
    }

    /**
     * @param {LEVEL} level - the level string to parse.
     * @return {number} - the level in number.
     */
    parseLevel (level) {
        if (level === Level.High) {
            return 1;
        }
        return 0;
    }

    /**
     * @param {PIN} pin - the pin to set.
     * @param {MODE} mode - the pin mode to set.
     */
    setPinMode (pin, mode) {
        if (this.isReady()) {
            pin = this.parsePin(pin);
            switch (mode) {
            case Mode.Input:
                mode = this._firmata.MODES.INPUT;
                break;
            case Mode.Output:
                mode = this._firmata.MODES.OUTPUT;
                break;
            case Mode.InputPullup:
                mode = this._firmata.MODES.PULLUP;
                break;
            }
            this._firmata.pinMode(pin, mode);
        }
    }

    /**
     * @param {PIN} pin - the pin to set.
     * @param {LEVEL} level - the pin level to set.
     */
    setDigitalOutput (pin, level) {
        if (this.isReady()) {
            pin = this.parsePin(pin);
            level = this.parseLevel(level);
            this._firmata.digitalWrite(pin, level);
        }
    }

    /**
     * @param {PIN} pin - the pin to set.
     * @param {VALUE} value - the pwm value to set.
     */
    setPwmOutput (pin, value) {
        if (this.isReady()) {
            pin = this.parsePin(pin);
            if (value < 0) {
                value = 0;
            }
            if (value > 255) {
                value = 255;
            }
            this._firmata.pinMode(pin, this._firmata.MODES.PWM);
            this._firmata.pwmWrite(pin, value);
        }
    }

    /**
     * @param {PIN} pin - the pin to read.
     * @return {Promise} - a Promise that resolves when read from peripheral.
     */
    readDigitalPin (pin) {
        if (this.isReady()) {
            pin = this.parsePin(pin);
            return new Promise(resolve => {
                this._firmata.digitalRead(pin, value => {
                    resolve(value);
                });
                window.setTimeout(() => {
                    resolve();
                }, FrimataReadTimeout);
            });
        }
    }

    /**
     * @param {PIN} pin - the pin to read.
     * @return {Promise} - a Promise that resolves when read from peripheral.
     */
    readAnalogPin (pin) {
        if (this.isReady()) {
            pin = this.parsePin(pin);
            // Shifting to analog pin number.
            pin = pin - this.numDigitalPins;
            this._firmata.pinMode(pin, this._firmata.MODES.ANALOG);
            return new Promise(resolve => {
                this._firmata.analogRead(pin, value => {
                    resolve(value);
                });
                window.setTimeout(() => {
                    resolve();
                }, FrimataReadTimeout);
            });
        }
    }

    /**
     * @param {PIN} pin - the pin to set.
     * @param {VALUE} value - the degree to set.
     */
    setServoOutput (pin, value) {
        if (this.isReady()) {
            pin = this.parsePin(pin);
            if (value < 0) {
                value = 0;
            }
            if (value > 180) {
                value = 180;
            }
            if (!this._configuredServoPins[pin]) {
                this._firmata.servoConfig(pin, 600, 2400);
                this._firmata.pinMode(pin, this._firmata.MODES.SERVO);
                this._configuredServoPins[pin] = true;
            }
            this._firmata.servoWrite(pin, value);
        }
    }

    /**
     * Play a buzzer tone for a fixed number of seconds.
     * @param {PIN} pin - the buzzer pin.
     * @param {number|string} frequency - the tone frequency.
     * @param {number|string} seconds - the tone duration in seconds.
     * @return {Promise} - resolves after the tone is stopped.
     */
    playToneForSeconds (pin, frequency, seconds) {
        if (this.isReady()) {
            pin = this.parsePin(pin);
            frequency = parseInt(frequency, 10);
            seconds = parseFloat(seconds);
            if (isNaN(frequency) || frequency < 0) {
                frequency = 0;
            }
            if (isNaN(seconds) || seconds < 0) {
                seconds = 0;
            }
            return new Promise(resolve => {
                this._firmata.buzzerTone(pin, frequency);
                window.setTimeout(() => {
                    this._firmata.buzzerNoTone(pin);
                    resolve();
                }, seconds * 1000);
            });
        }
        return Promise.resolve();
    }

    /**
     * Stop a buzzer tone.
     * @param {PIN} pin - the buzzer pin.
     */
    stopTone (pin) {
        if (this.isReady()) {
            pin = this.parsePin(pin);
            this._firmata.buzzerNoTone(pin);
        }
    }

    /**
     * Read distance from HC-SR04 compatible ultrasonic sensor.
     * @param {PIN} trigPin - trigger pin.
     * @param {PIN} echoPin - echo pin.
     * @param {string} unit - CM or INC.
     * @return {Promise} - resolves with the distance.
     */
    readUltrasonicDistance (trigPin, echoPin, unit) {
        if (this.isReady()) {
            trigPin = this.parsePin(trigPin);
            echoPin = this.parsePin(echoPin);
            unit = unit === 'INC' ? 1 : 0;
            return new Promise(resolve => {
                this._firmata.sonarRead(trigPin, echoPin, unit, value => resolve(value));
                window.setTimeout(() => {
                    resolve(0);
                }, FrimataReadTimeout);
            });
        }
        return Promise.resolve(0);
    }
}

module.exports = ArduinoPeripheral;
