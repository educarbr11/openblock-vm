const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const log = require('../../util/log');
const cast = require('../../util/cast');
const formatMessage = require('format-message');
const BLE = require('../../io/ble');
const Base64Util = require('../../util/base64-util');

/**
 * Icon png to be displayed at the left edge of each extension block, encoded as a data URI.
 * @type {string}
 */
// eslint-disable-next-line max-len
const blockIconURI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAYAAACOEfKtAAAACXBIWXMAABYlAAAWJQFJUiTwAAAKcElEQVR42u2cfXAU9RnHv7u3L3d7l9yR5PIGXO7MkQKaYiCUWqJhFGvRMk4JZXSc8aXVaSmiYlthVHQEW99FxiIdrVY6teiMdoa+ICqhIqgQAsjwMgYDOQKXl7uY17u9293b3f5x5JKYe8+FJGSfvzbP/n77e/azz+95nt9v90KoqgpN0hdSQ6AB1ABqADWAmmgANYAaQA2gJhpADeBEE2q8GPLaWzu/CslyiY4k9dOn5uijtXGd7+jWkaReVpT3Hrhv6d0awEFC07rgD+ZeYYnXprhwigUAvjj0zbjxQCLebozT7iDzK1ZUWCru2K7L//6MVC8ue45Blz8n6rlQ815QtuohOlXiEdy/AUqPa6y59Mkh6Q1345GNja6m7pHEQKNl3t0704EXat4L6fSOmOeEI1vHKzwAyNJR9MPFpRUPOu0ONm2A0xatWaTLm5WfDrzvAppA8AbiG03fC8CQNkDKZK2YrPAuRrhpifJERsuYywveJc7CqcIDMAyeLm82dEXzw39I/qjXkpr3QuW9lxfAdOABGAKPslWDnbsy7Jl8BxTeM3SqmO0gaA5U6c3jymup0YSn9JyLee67wpTfBQAQjmyF3HFqiJcRtDECjy5dAmbmcgQPvjjxl3Lx4IVjnD/5cE1zkWtyP34VBGcdKLJnLgc9cznk1kMXFdzEn8KJ4KUqqsSHvcxWDf7j1UM8UPr6/YgHhhX8xAaYaXgAIB7fBnbuSrBzV8aNgarEQ/z6/YkLcDTg9V9XlXjQtuqoU1TpcUHlvZDOfDiuyh5qPMCLrJ1bDw3EuUtx81N/BH3pjQBJQ2HMF5V6iKfeRchVm9kkMtrwxmSdobeA9daBde8GwVlBcFYofS1Jw0vaAy9HeJHQwBUPzIBvGxDc92Rmp/BowJs10wkAONfsBs8HAAAltqngOAO8HZ3o6OiMqcvLy4E1Lwc8H8C5ZndMXdLJa/qNacNLCDBw/O8nFUNWxp/64+tWAwBefe1tHKg7CgC4/9d3ori4EHv3HcDrb26PqVt2602ovvaHaGlpw+8ffSamLqXYmya8jG8mpFy6iGLkWLh4HAwG4+r6j4VBfaPpLgU8IMGO9MLqW2pYQ9aQokuR5dgXIwCC1CUcNMj3hpdvLAdSF54EYpCHooRA0Swomo2pC0kCQpIAkqTA6LmYupgxL0X7m78+aG10NXVkpIwxsAwWXncDCESHLkohfPbpbiT6ZFPPZQ9fC0e58Wi6wTDj6UbT/rQAyiERS2pW4Kc3LQDLRO8miCEAKj7d83FcTxyLJJJJ+9MCqKoq9HomMrgkSThxsgEcZ8AMpwMkSYJlKDA0DVUFiHGWRDJp/4jXwqIo4uFHnkZXdw8AYGbZFXhs3WqQJDkhkkim7E8KoMlkxKbnn8DBunrwUli3e8/+yOAA0HjmHDq7upGXm5PUoDUr7hmWRB5Zt3FYwoime+vtd/H6G9uGJIxouniSyP6H7v8FystnY80jGzIA0MihsMAKu20aTp3JzFb6WCWRuDUvHwByw8cOhw2FBVaYjNzIAba1e3Hfb9aiq7MTNStuBwAsvr4KO3d9GnmKztIS5EyxTJiVSDT7p04tipx/9MnnYc7ORlu7NzMxsK3di5AkDHgGw2DTC+uHBeGJshJJZL/fxyMQEDKbRAiCQDAoQhBDYBkKNE2j4uqrhpUBoiSBIMZfEhkN+1NeiWSqEB2rlUg69md0JRIQRHy86z8jXsqNVRLJlP0jqgNJXXgAgjbCcONmCHUvQ+44NWG2s/rtH5Mt/ciToo0wLH4JBGO6LLazRiJk2vBYy4gHHw/bWSN+LZBKEhkMjzn/CaSiKgQOvJDyFB7L7axUJWNJZDA8IhQA1boPin7KZbMSGfUYyFx9b3hXg/cCsoBA2Z0AoYOaxlcC4+mdyCUDKBzanLFBJ3USyaRMuiSSKZmUSSSTMimTCABUlblRU9kAZ0E39p+eii21c+EL0jHbOwu6sfaWgyjND//U4oP6MmzZnfi79XT7mfQSNi7bh0JzOLG19XBY/89r49pYVebGqhuOosDsh1+gsWV3BXYdd2Q+BlaVuXFv9bHgkSbzk+vfcVRyjHhi47J9cftsXLYf7T36Ix8cLHlo6ydlv6qpPI2qssRZcuOy/Wjp4k5s+2zG+offKqtcUt6kJtNv7S0H0RtkvEufXTB/6bML5je2Wy7UVDbEbF9o9mPDsv2oP5v75vbPS26rP5u3fdXiozDppcwDrKlswOlWy9E//DX09Mt/azh8zzNM1RybF86C7pheVGD240CDeX3NWtfml94Rt+0+Mf3Lm8qbEnpfgdmPs+3G9+564vTT//pM/GrHYduWRP0AYOEMN/5S61xT92Vtfd2XtfWb/vu91fHALyxzw9tnkB/cTD5w+2Ou9375HHtfa7exM5mxRpKFaafdQQKgAcDERs98/foLHrXdaXfoABi8vczhWO2/28/TRR5z2h00gKymNl1ton79oigq6bQ7dE67Q+ew9mb1h4FYYwVESgLAXLSRa+3mWpIdK+UYuPiq89f8+XfT/+ftZQ4vLm9ZmUyfdcsv1M2fWfRaUCK8i8vdK1u6ktuAWPWTsztm24o/cnnYHUsrWzd1+fVJ9XtqxbG3XzFdNcPTawjcueibpxK1t+X26f/9R8a953jub4typOvm2b1XnvUmv8JKWMZcaZffX3XDERRP8cGaFRjWxtPLoZvXY4oxgPBNEsgxBhCUKEzL6Ru+JydS8Ak0giKFgESDJFQoKmCgQzAwIfQEWETzmoBIwd2VNaStu8uEHGO4Buz06zHHFv0dRkefAZ1+PQx0KNK2eIoPLCUj2zDc275qzgcBFWv+cf3IyxgTK2KOzQufEM5kfpGF12eGPSf8DXN+No/87HDWiwYYALw+M6ym8AscAxO++X7xCTRM7EDQzht0Da8v/NWo1dQDAxNCocUXs+303IGHdaptOmYXnh/SLlZbV+fwnwJm6UXEm/ojqgM/PFmJQ81OPHfrtqT7bN23BE8seTflYLvz5DwYGQHLKz5Puo/XZ8aLtT+D1dSDuxbsGQIymmz48DbwIguOESJOcce8XaO3oVpZ8k3Em5KVVAAMFnuOB9as1MbimCBunn04vBmR40ls29Wfgxf1KMn1gBdY+MXUCvK4ANvPndpLzrLzALjBN2VPwrDBksgLYkn1jBMp90nVY2++8vAw3RlPeLNYVZSPAEgjKWP6ZCn4lF+gMdnE08spQb73RQB9aXtgo6tJcNodf8rWz3L//Br340UW3sExEkXrFFKSSUVHqkRfkJZ8QSZk5gS6hw9H+GyDQAclSs41BVmSUIn+toAKIUTJskKoQUknCxKlkISKb/sM0NMyyVAhXW+AlYosfgOgQlUJVadTSUWBKoQoudvPioPbenq5oIUTaRUqenhWKi3oyVIUqKpKREoLggDhF6hQb4CV9LRM9rctMPN6glChp2SdTqeSskwoAECSKnG61fzFR/XsGu+FhmONriYl7TImsjoYKJyZSeB8CoBQo6spqU8TCO1fgE7gDVUNoCYaQA2gBlADqAHURAOoAdQAagA10QCOgfwfNp/hXbfBMCAAAAAASUVORK5CYII=';

/**
 * Enum for micro:bit BLE command protocol.
 * https://github.com/LLK/scratch-microbit-firmware/blob/master/protocol.md
 * @readonly
 * @enum {number}
 */
const BLECommand = {
    CMD_PIN_CONFIG: 0x80,
    CMD_DISPLAY_TEXT: 0x81,
    CMD_DISPLAY_LED: 0x82,
    CMD_PIN_PWM: 0x83,
    CMD_EXTENDED_TELEMETRY: 0x84
};


/**
 * A time interval to wait (in milliseconds) before reporting to the BLE socket
 * that data has stopped coming from the peripheral.
 */
const BLETimeout = 15000;

/**
 * Number of missed sensor packet windows tolerated before treating the
 * connection as lost. The Link will still report real disconnects immediately.
 */
const BLEDataTimeoutLimit = 4;

/**
 * A time interval to wait (in milliseconds) while a block that sends a BLE message is running.
 * @type {number}
 */
const BLESendInterval = 100;

/**
 * A string to report to the BLE socket when the micro:bit has stopped receiving data.
 * @type {string}
 */
const BLEDataStoppedError = 'micro:bit extension stopped receiving data';

/**
 * Enum for micro:bit protocol.
 * https://github.com/LLK/scratch-microbit-firmware/blob/master/protocol.md
 * @readonly
 * @enum {string}
 */
const BLEUUID = {
    service: 0xf005,
    rxChar: '5261da01-fa7e-42ab-850b-7c80220097cc',
    txChar: '5261da02-fa7e-42ab-850b-7c80220097cc'
};

const ExtendedTelemetryPacket = {
    MARKER: 0xd0,
    VERSION: 1,
    LENGTH: 20
};

/**
 * Manage communication with a MicroBit peripheral over a Scrath Link client socket.
 */
class MicroBit {

    /**
     * Construct a MicroBit communication object.
     * @param {Runtime} runtime - the Scratch 3.0 runtime
     * @param {string} extensionId - the id of the extension
     */
    constructor (runtime, extensionId) {

        /**
         * The Scratch 3.0 runtime used to trigger the green flag button.
         * @type {Runtime}
         * @private
         */
        this._runtime = runtime;

        /**
         * The BluetoothLowEnergy connection socket for reading/writing peripheral data.
         * @type {BLE}
         * @private
         */
        this._ble = null;
        this._runtime.registerPeripheralExtension(extensionId, this);

        /**
         * The id of the extension this peripheral belongs to.
         */
        this._extensionId = extensionId;

        /**
         * The most recently received value for each sensor.
         * @type {Object.<string, number>}
         * @private
         */
        this._sensors = {
            tiltX: 0,
            tiltY: 0,
            buttonA: 0,
            buttonB: 0,
            touchPins: [0, 0, 0],
            gestureState: 0,
            ledMatrixState: new Uint8Array(5),
            analogPins: [0, 0, 0],
            accelerationX: 0,
            accelerationY: 0,
            accelerationZ: 0,
            temperature: 0,
            lightLevel: 0,
            runningTime: 0
        };

        /**
         * The most recently received value for each gesture.
         * @type {Object.<string, Object>}
         * @private
         */
        this._gestures = {
            moving: false,
            move: {
                active: false,
                timeout: false
            },
            shake: {
                active: false,
                timeout: false
            },
            jump: {
                active: false,
                timeout: false
            }
        };

        /**
         * Interval ID for data reading timeout.
         * @type {number}
         * @private
         */
        this._timeoutID = null;

        /**
         * A flag that is true while we are busy sending data to the BLE socket.
         * @type {boolean}
         * @private
         */
        this._busy = false;

        /**
         * ID for a timeout which is used to clear the busy flag if it has been
         * true for a long time.
         */
        this._busyTimeoutID = null;

        /**
         * Queue used to serialize BLE writes. The micro:bit Scratch BLE firmware
         * expects small ordered writes; dropping writes while busy makes pin
         * toggles inside forever loops unreliable.
         * @type {Promise}
         * @private
         */
        this._sendQueue = Promise.resolve();
        this._missedDataTimeouts = 0;

        this.reset = this.reset.bind(this);
        this._onConnect = this._onConnect.bind(this);
        this._onMessage = this._onMessage.bind(this);
        this._handleDataTimeout = this._handleDataTimeout.bind(this);
    }

    /**
     * @param {string} text - the text to display.
     * @return {Promise} - a Promise that resolves when writing to peripheral.
     */
    displayText (text) {
        const output = new Uint8Array(text.length);
        for (let i = 0; i < text.length; i++) {
            output[i] = text.charCodeAt(i);
        }
        return this.send(BLECommand.CMD_DISPLAY_TEXT, output);
    }

    /**
     * @param {Uint8Array} matrix - the matrix to display.
     * @return {Promise} - a Promise that resolves when writing to peripheral.
     */
    displayMatrix (matrix) {
        return this.send(BLECommand.CMD_DISPLAY_LED, matrix);
    }

    /**
     * Set a touch pin digital value through the Scratch micro:bit BLE protocol.
     * @param {number} pin - the pin number to set.
     * @param {number} value - the digital value, 0 or 1.
     * @return {Promise} - a Promise that resolves when writing to peripheral.
     */
    setPinValue (pin, value) {
        return this.send(BLECommand.CMD_PIN_CONFIG, new Uint8Array([pin, value]));
    }

    /**
     * Set a PWM value on P0/P1/P2 using Dogoblock BLE firmware.
     * @param {number} pin - the pin number to set.
     * @param {number} value - the PWM value, 0..1023.
     * @return {Promise} - a Promise that resolves when writing to peripheral.
     */
    setPwmValue (pin, value) {
        value = Math.max(0, Math.min(1023, Math.round(value)));
        return this.send(BLECommand.CMD_PIN_PWM, new Uint8Array([pin, (value >> 8) & 0xff, value & 0xff]));
    }

    /**
     * Enable extended Dogoblock telemetry packets. Official Scratch firmware
     * ignores this unknown command, keeping the extension backward compatible.
     * @return {Promise} - a Promise that resolves when writing to peripheral.
     */
    enableExtendedTelemetry () {
        if (!this._ble) return Promise.resolve();

        const output = new Uint8Array([BLECommand.CMD_EXTENDED_TELEMETRY, 1]);
        const data = Base64Util.uint8ArrayToBase64(output);
        return this._ble.write(BLEUUID.service, BLEUUID.txChar, data, 'base64', true);
    }

    /**
     * Clear the Scratch firmware pin/touch configuration. This is a compatibility
     * fallback for boards still running the official Scratch BLE firmware, where
     * CMD_PIN_CONFIG is not a real digital write and may leave a pin pulled high.
     * Dogoblock firmware should ignore this one-byte payload.
     * @return {Promise} - a Promise that resolves when writing to peripheral.
     */
    clearPinConfig () {
        return this.send(BLECommand.CMD_PIN_CONFIG, new Uint8Array([0]));
    }

    /**
     * @return {number} - the latest value received for the tilt sensor's tilt about the X axis.
     */
    get tiltX () {
        return this._sensors.tiltX;
    }

    /**
     * @return {number} - the latest value received for the tilt sensor's tilt about the Y axis.
     */
    get tiltY () {
        return this._sensors.tiltY;
    }

    /**
     * @return {boolean} - the latest value received for the A button.
     */
    get buttonA () {
        return this._sensors.buttonA;
    }

    /**
     * @return {boolean} - the latest value received for the B button.
     */
    get buttonB () {
        return this._sensors.buttonB;
    }

    /**
     * @return {number} - the latest value received for the motion gesture states.
     */
    get gestureState () {
        return this._sensors.gestureState;
    }

    /**
     * @return {Uint8Array} - the current state of the 5x5 LED matrix.
     */
    get ledMatrixState () {
        return this._sensors.ledMatrixState;
    }

    get temperature () {
        return this._sensors.temperature;
    }

    get lightLevel () {
        return this._sensors.lightLevel;
    }

    get runningTime () {
        return this._sensors.runningTime;
    }

    get accelerationX () {
        return this._sensors.accelerationX;
    }

    get accelerationY () {
        return this._sensors.accelerationY;
    }

    get accelerationZ () {
        return this._sensors.accelerationZ;
    }

    /**
     * Called by the runtime when user wants to scan for a peripheral.
     * @param {Array} _pnpIdList - unused list of plug and play ids.
     * @param {boolean} listAll - whether to list all connectable peripherals.
     * @param {string} connectionType - optional connection transport type.
     */
    scan (_pnpIdList, listAll = false, connectionType = 'link') {
        if (this._ble) {
            this._ble.disconnect();
        }
        this._ble = new BLE(this._runtime, this._extensionId, {
            connectionType,
            listAll,
            filters: [
                {services: [BLEUUID.service]}
            ]
        }, this._onConnect, this.reset);
    }

    /**
     * Called by the runtime when user wants to connect to a certain peripheral.
     * @param {number} id - the id of the peripheral to connect to.
     */
    connect (id) {
        if (this._ble) {
            this._ble.connectPeripheral(id);
        }
    }

    /**
     * Disconnect from the micro:bit.
     */
    disconnect () {
        if (this._ble) {
            this._ble.disconnect();
        }

        this.reset();
    }

    uploadFirmware () {
        if (this._ble) {
            this._ble.disconnect();
        }
        this._ble = new BLE(this._runtime, this._extensionId, {
            connectionType: 'link',
            skipInitialDiscover: true,
            filters: [
                {services: [BLEUUID.service]}
            ]
        }, this._onConnect, this.reset);
        this._ble.uploadFirmware({type: this._extensionId});
    }

    abortUpload () {
        if (this._ble) {
            this._ble.abortUpload();
        }
    }

    /**
     * Reset all the state and timeout/interval ids.
     */
    reset () {
        if (this._timeoutID) {
            window.clearTimeout(this._timeoutID);
            this._timeoutID = null;
        }
        this._missedDataTimeouts = 0;
        this._sendQueue = Promise.resolve();
    }

    /**
     * Return true if connected to the micro:bit.
     * @return {boolean} - whether the micro:bit is connected.
     */
    isConnected () {
        let connected = false;
        if (this._ble) {
            connected = this._ble.isConnected();
        }
        return connected;
    }

    /**
     * Send a message to the peripheral BLE socket.
     * @param {number} command - the BLE command hex.
     * @param {Uint8Array} message - the message to write
     * @return {Promise} - a Promise that resolves when writing to peripheral.
     */
    send (command, message) {
        if (!this.isConnected()) return Promise.resolve();

        const output = new Uint8Array(message.length + 1);
        output[0] = command; // attach command to beginning of message
        for (let i = 0; i < message.length; i++) {
            output[i + 1] = message[i];
        }
        const data = Base64Util.uint8ArrayToBase64(output);

        const queuedWrite = this._sendQueue
            .catch(() => {
                // Keep the queue alive after a failed BLE write.
            })
            .then(() => this._ble.write(BLEUUID.service, BLEUUID.txChar, data, 'base64', true));

        this._sendQueue = queuedWrite.catch(() => {});
        return queuedWrite;
    }

    /**
     * Starts reading data from peripheral after BLE has connected to it.
     * @return {Promise} resolves after notifications are ready.
     * @private
     */
    _onConnect () {
        return this._ble.startNotifications(BLEUUID.service, BLEUUID.rxChar, this._onMessage)
            .then(() => {
                this._missedDataTimeouts = 0;
                this._timeoutID = window.setTimeout(
                    this._handleDataTimeout,
                    BLETimeout
                );
                return this.enableExtendedTelemetry()
                    .catch(() => {
                        // Official Scratch firmware does not implement this command.
                    });
            })
            .catch(error => {
                const message = error && error.message ? error.message : String(error);
                throw new Error(
                    `Não foi possível iniciar os dados BLE do micro:bit. ` +
                    `Reenvie o firmware Dogoblock BLE e tente conectar novamente. Detalhes: ${message}`
                );
            });
    }

    /**
     * Process the sensor data from the incoming BLE characteristic.
     * @param {object} base64 - the incoming BLE data.
     * @private
     */
    _onMessage (base64) {
        // parse data
        const data = Base64Util.base64ToUint8Array(base64);
        if (data.length < 10) {
            return;
        }

        if (data.length >= ExtendedTelemetryPacket.LENGTH &&
            data[0] === ExtendedTelemetryPacket.MARKER &&
            data[1] === ExtendedTelemetryPacket.VERSION) {
            this._parseExtendedTelemetry(data);
            return;
        }

        this._sensors.tiltX = data[1] | (data[0] << 8);
        if (this._sensors.tiltX > (1 << 15)) this._sensors.tiltX -= (1 << 16);
        this._sensors.tiltY = data[3] | (data[2] << 8);
        if (this._sensors.tiltY > (1 << 15)) this._sensors.tiltY -= (1 << 16);

        this._sensors.buttonA = data[4];
        this._sensors.buttonB = data[5];

        this._sensors.touchPins[0] = data[6];
        this._sensors.touchPins[1] = data[7];
        this._sensors.touchPins[2] = data[8];

        this._sensors.gestureState = data[9];

        // cancel disconnect timeout and start a new one
        this._missedDataTimeouts = 0;
        window.clearTimeout(this._timeoutID);
        this._timeoutID = window.setTimeout(
            this._handleDataTimeout,
            BLETimeout
        );
    }

    _parseInt16 (data, offset) {
        let value = data[offset + 1] | (data[offset] << 8);
        if (value >= (1 << 15)) value -= (1 << 16);
        return value;
    }

    _parseUInt16 (data, offset) {
        return data[offset + 1] | (data[offset] << 8);
    }

    _parseUInt32 (data, offset) {
        return ((data[offset] * 0x1000000) +
            (data[offset + 1] << 16) +
            (data[offset + 2] << 8) +
            data[offset + 3]) >>> 0;
    }

    _parseInt8 (value) {
        return value > 127 ? value - 256 : value;
    }

    _parseExtendedTelemetry (data) {
        this._sensors.analogPins[0] = this._parseUInt16(data, 2);
        this._sensors.analogPins[1] = this._parseUInt16(data, 4);
        this._sensors.analogPins[2] = this._parseUInt16(data, 6);
        this._sensors.accelerationX = this._parseInt16(data, 8);
        this._sensors.accelerationY = this._parseInt16(data, 10);
        this._sensors.accelerationZ = this._parseInt16(data, 12);
        this._sensors.temperature = this._parseInt8(data[14]);
        this._sensors.lightLevel = data[15];
        this._sensors.runningTime = this._parseUInt32(data, 16);

        this._missedDataTimeouts = 0;
        window.clearTimeout(this._timeoutID);
        this._timeoutID = window.setTimeout(
            this._handleDataTimeout,
            BLETimeout
        );
    }

    /**
     * Sensor notifications can pause briefly while the micro:bit is busy with
     * display/BLE operations. Avoid dropping a healthy Link connection on the
     * first missed packet window; real BLE disconnects are still reported by
     * the Link through peripheralUnplug/socket close.
     * @private
     */
    _handleDataTimeout () {
        if (!this._ble || !this._ble.isConnected()) return;

        this._missedDataTimeouts++;
        if (this._missedDataTimeouts >= BLEDataTimeoutLimit) {
            this._ble.handleDisconnectError(BLEDataStoppedError);
            return;
        }

        this._timeoutID = window.setTimeout(
            this._handleDataTimeout,
            BLETimeout
        );
    }

    /**
     * @param {number} pin - the pin to check touch state.
     * @return {number} - the latest value received for the touch pin states.
     * @private
     */
    _checkPinState (pin) {
        return this._sensors.touchPins[pin];
    }

    _readAnalogPin (pin) {
        return this._sensors.analogPins[pin] || 0;
    }
}

/**
 * Enum for tilt sensor direction.
 * @readonly
 * @enum {string}
 */
const MicroBitTiltDirection = {
    FRONT: 'front',
    BACK: 'back',
    LEFT: 'left',
    RIGHT: 'right',
    ANY: 'any'
};

/**
 * Enum for micro:bit gestures.
 * @readonly
 * @enum {string}
 */
const MicroBitGestures = {
    MOVED: 'moved',
    SHAKEN: 'shaken',
    JUMPED: 'jumped'
};

/**
 * Enum for micro:bit buttons.
 * @readonly
 * @enum {string}
 */
const MicroBitButtons = {
    A: 'A',
    B: 'B',
    ANY: 'any'
};

/**
 * Enum for micro:bit pin states.
 * @readonly
 * @enum {string}
 */
const MicroBitPinState = {
    ON: 'on',
    OFF: 'off'
};

/**
 * Enum for micro:bit accelerometer axis.
 * @readonly
 * @enum {string}
 */
const MicroBitAxis = {
    X: 'x',
    Y: 'y',
    Z: 'z'
};

/**
 * Scratch 3.0 blocks to interact with a MicroBit peripheral.
 */
class Scratch3MicroBitBlocks {

    /**
     * @return {string} - the name of this extension.
     */
    static get EXTENSION_NAME () {
        return 'micro:bit Bluetooth';
    }

    /**
     * @return {string} - the ID of this extension.
     */
    static get EXTENSION_ID () {
        return 'microbitBle';
    }

    /**
     * @return {string} - the ID of this extension.
     */
    get EXTENSION_ID () {
        return Scratch3MicroBitBlocks.EXTENSION_ID;
    }

    /**
     * @return {number} - the tilt sensor counts as "tilted" if its tilt angle meets or exceeds this threshold.
     */
    static get TILT_THRESHOLD () {
        return 15;
    }

    /**
     * @return {array} - text and values for each buttons menu element
     */
    get BUTTONS_MENU () {
        return [
            {
                text: 'A',
                value: MicroBitButtons.A
            },
            {
                text: 'B',
                value: MicroBitButtons.B
            },
            {
                text: formatMessage({
                    id: 'microbit.buttonsMenu.any',
                    default: 'any',
                    description: 'label for "any" element in button picker for micro:bit extension'
                }),
                value: MicroBitButtons.ANY
            }
        ];
    }

    /**
     * @return {array} - text and values for each gestures menu element
     */
    get GESTURES_MENU () {
        return [
            {
                text: formatMessage({
                    id: 'microbit.gesturesMenu.moved',
                    default: 'moved',
                    description: 'label for moved gesture in gesture picker for micro:bit extension'
                }),
                value: MicroBitGestures.MOVED
            },
            {
                text: formatMessage({
                    id: 'microbit.gesturesMenu.shaken',
                    default: 'shaken',
                    description: 'label for shaken gesture in gesture picker for micro:bit extension'
                }),
                value: MicroBitGestures.SHAKEN
            },
            {
                text: formatMessage({
                    id: 'microbit.gesturesMenu.jumped',
                    default: 'jumped',
                    description: 'label for jumped gesture in gesture picker for micro:bit extension'
                }),
                value: MicroBitGestures.JUMPED
            }
        ];
    }

    /**
     * @return {array} - text and values for each pin state menu element
     */
    get PIN_STATE_MENU () {
        return [
            {
                text: formatMessage({
                    id: 'microbit.pinStateMenu.on',
                    default: 'on',
                    description: 'label for on element in pin state picker for micro:bit extension'
                }),
                value: MicroBitPinState.ON
            },
            {
                text: formatMessage({
                    id: 'microbit.pinStateMenu.off',
                    default: 'off',
                    description: 'label for off element in pin state picker for micro:bit extension'
                }),
                value: MicroBitPinState.OFF
            }
        ];
    }

    /**
     * @return {array} - text and values for each digital pin value menu element
     */
    get PIN_VALUE_MENU () {
        return [
            {
                text: '0',
                value: '0'
            },
            {
                text: '1',
                value: '1'
            }
        ];
    }

    /**
     * @return {array} - text and values for each accelerometer axis.
     */
    get AXIS_MENU () {
        return [
            {
                text: 'X',
                value: MicroBitAxis.X
            },
            {
                text: 'Y',
                value: MicroBitAxis.Y
            },
            {
                text: 'Z',
                value: MicroBitAxis.Z
            }
        ];
    }

    /**
     * @return {array} - text and values for each tilt direction menu element
     */
    get TILT_DIRECTION_MENU () {
        return [
            {
                text: formatMessage({
                    id: 'microbit.tiltDirectionMenu.front',
                    default: 'front',
                    description: 'label for front element in tilt direction picker for micro:bit extension'
                }),
                value: MicroBitTiltDirection.FRONT
            },
            {
                text: formatMessage({
                    id: 'microbit.tiltDirectionMenu.back',
                    default: 'back',
                    description: 'label for back element in tilt direction picker for micro:bit extension'
                }),
                value: MicroBitTiltDirection.BACK
            },
            {
                text: formatMessage({
                    id: 'microbit.tiltDirectionMenu.left',
                    default: 'left',
                    description: 'label for left element in tilt direction picker for micro:bit extension'
                }),
                value: MicroBitTiltDirection.LEFT
            },
            {
                text: formatMessage({
                    id: 'microbit.tiltDirectionMenu.right',
                    default: 'right',
                    description: 'label for right element in tilt direction picker for micro:bit extension'
                }),
                value: MicroBitTiltDirection.RIGHT
            }
        ];
    }

    /**
     * @return {array} - text and values for each tilt direction (plus "any") menu element
     */
    get TILT_DIRECTION_ANY_MENU () {
        return [
            ...this.TILT_DIRECTION_MENU,
            {
                text: formatMessage({
                    id: 'microbit.tiltDirectionMenu.any',
                    default: 'any',
                    description: 'label for any direction element in tilt direction picker for micro:bit extension'
                }),
                value: MicroBitTiltDirection.ANY
            }
        ];
    }

    /**
     * Construct a set of MicroBit blocks.
     * @param {Runtime} runtime - the Scratch 3.0 runtime.
     */
    constructor (runtime) {
        /**
         * The Scratch 3.0 runtime.
         * @type {Runtime}
         */
        this.runtime = runtime;

        // Create a new MicroBit peripheral instance
        this._peripheral = new MicroBit(this.runtime, Scratch3MicroBitBlocks.EXTENSION_ID);
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo () {
        return [{
            id: Scratch3MicroBitBlocks.EXTENSION_ID,
            name: Scratch3MicroBitBlocks.EXTENSION_NAME,
            blockIconURI: blockIconURI,
            showStatusButton: true,
            blocks: [
                {
                    opcode: 'uploadBleFirmware',
                    text: formatMessage({
                        id: 'microbitBle.uploadBleFirmware',
                        default: 'send Bluetooth firmware',
                        description: 'upload Scratch compatible Bluetooth firmware to the micro:bit'
                    }),
                    blockType: BlockType.COMMAND
                },
                '---',
                {
                    opcode: 'whenButtonPressed',
                    text: formatMessage({
                        id: 'microbit.whenButtonPressed',
                        default: 'when [BTN] button pressed',
                        description: 'when the selected button on the micro:bit is pressed'
                    }),
                    blockType: BlockType.HAT,
                    arguments: {
                        BTN: {
                            type: ArgumentType.STRING,
                            menu: 'buttons',
                            defaultValue: MicroBitButtons.A
                        }
                    }
                },
                {
                    opcode: 'isButtonPressed',
                    text: formatMessage({
                        id: 'microbit.isButtonPressed',
                        default: '[BTN] button pressed?',
                        description: 'is the selected button on the micro:bit pressed?'
                    }),
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        BTN: {
                            type: ArgumentType.STRING,
                            menu: 'buttons',
                            defaultValue: MicroBitButtons.A
                        }
                    }
                },
                '---',
                {
                    opcode: 'whenGesture',
                    text: formatMessage({
                        id: 'microbit.whenGesture',
                        default: 'when [GESTURE]',
                        description: 'when the selected gesture is detected by the micro:bit'
                    }),
                    blockType: BlockType.HAT,
                    arguments: {
                        GESTURE: {
                            type: ArgumentType.STRING,
                            menu: 'gestures',
                            defaultValue: MicroBitGestures.MOVED
                        }
                    }
                },
                '---',
                {
                    opcode: 'displaySymbol',
                    text: formatMessage({
                        id: 'microbit.displaySymbol',
                        default: 'display [MATRIX]',
                        description: 'display a pattern on the micro:bit display'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        MATRIX: {
                            type: ArgumentType.MATRIX,
                            defaultValue: '0101010101100010101000100'
                        }
                    }
                },
                {
                    opcode: 'displayText',
                    text: formatMessage({
                        id: 'microbit.displayText',
                        default: 'display text [TEXT]',
                        description: 'display text on the micro:bit display'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: formatMessage({
                                id: 'microbit.defaultTextToDisplay',
                                default: 'Hello!',
                                description: `default text to display.
                                IMPORTANT - the micro:bit only supports letters a-z, A-Z.
                                Please substitute a default word in your language
                                that can be written with those characters,
                                substitute non-accented characters or leave it as "Hello!".
                                Check the micro:bit site documentation for details`
                            })
                        }
                    }
                },
                {
                    opcode: 'displayClear',
                    text: formatMessage({
                        id: 'microbit.clearDisplay',
                        default: 'clear display',
                        description: 'display nothing on the micro:bit display'
                    }),
                    blockType: BlockType.COMMAND
                },
                '---',
                {
                    opcode: 'whenTilted',
                    text: formatMessage({
                        id: 'microbit.whenTilted',
                        default: 'when tilted [DIRECTION]',
                        description: 'when the micro:bit is tilted in a direction'
                    }),
                    blockType: BlockType.HAT,
                    arguments: {
                        DIRECTION: {
                            type: ArgumentType.STRING,
                            menu: 'tiltDirectionAny',
                            defaultValue: MicroBitTiltDirection.ANY
                        }
                    }
                },
                {
                    opcode: 'isTilted',
                    text: formatMessage({
                        id: 'microbit.isTilted',
                        default: 'tilted [DIRECTION]?',
                        description: 'is the micro:bit is tilted in a direction?'
                    }),
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        DIRECTION: {
                            type: ArgumentType.STRING,
                            menu: 'tiltDirectionAny',
                            defaultValue: MicroBitTiltDirection.ANY
                        }
                    }
                },
                {
                    opcode: 'getTiltAngle',
                    text: formatMessage({
                        id: 'microbit.tiltAngle',
                        default: 'tilt angle [DIRECTION]',
                        description: 'how much the micro:bit is tilted in a direction'
                    }),
                    blockType: BlockType.REPORTER,
                    arguments: {
                        DIRECTION: {
                            type: ArgumentType.STRING,
                            menu: 'tiltDirection',
                            defaultValue: MicroBitTiltDirection.FRONT
                        }
                    }
                },
                '---',
                {
                    opcode: 'whenPinConnected',
                    text: formatMessage({
                        id: 'microbit.whenPinConnected',
                        default: 'when pin [PIN] connected',
                        description: 'when the pin detects a connection to Earth/Ground'

                    }),
                    blockType: BlockType.HAT,
                    arguments: {
                        PIN: {
                            type: ArgumentType.STRING,
                            menu: 'touchPins',
                            defaultValue: '0'
                        }
                    }
                },
                {
                    opcode: 'isPinConnected',
                    text: formatMessage({
                        id: 'microbit.isPinConnected',
                        default: 'pin [PIN] connected?',
                        description: 'whether the selected micro:bit pin is connected to Earth/Ground'
                    }),
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        PIN: {
                            type: ArgumentType.STRING,
                            menu: 'touchPins',
                            defaultValue: '0'
                        }
                    }
                },
                {
                    opcode: 'getPinValue',
                    text: formatMessage({
                        id: 'microbit.pinValue',
                        default: 'pin [PIN] value',
                        description: 'the latest touch connection value for the selected micro:bit pin'
                    }),
                    blockType: BlockType.REPORTER,
                    arguments: {
                        PIN: {
                            type: ArgumentType.STRING,
                            menu: 'touchPins',
                            defaultValue: '0'
                        }
                    }
                },
                {
                    opcode: 'setPinValue',
                    text: formatMessage({
                        id: 'microbit.setPinValue',
                        default: 'set pin [PIN] value to [VALUE]',
                        description: 'set the selected micro:bit pin digital value to 0 or 1'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        PIN: {
                            type: ArgumentType.STRING,
                            menu: 'touchPins',
                            defaultValue: '0'
                        },
                        VALUE: {
                            type: ArgumentType.STRING,
                            menu: 'pinValues',
                            defaultValue: '1'
                        }
                    }
                },
                {
                    opcode: 'setPwmValue',
                    text: formatMessage({
                        id: 'microbit.setPwmValue',
                        default: 'set pin [PIN] PWM to [VALUE]',
                        description: 'set the selected micro:bit pin PWM value from 0 to 1023'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        PIN: {
                            type: ArgumentType.STRING,
                            menu: 'touchPins',
                            defaultValue: '0'
                        },
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1023
                        }
                    }
                },
                {
                    opcode: 'getAnalogPinValue',
                    text: formatMessage({
                        id: 'microbit.analogPinValue',
                        default: 'analog pin [PIN] value',
                        description: 'the latest analog value for the selected micro:bit pin'
                    }),
                    blockType: BlockType.REPORTER,
                    arguments: {
                        PIN: {
                            type: ArgumentType.STRING,
                            menu: 'touchPins',
                            defaultValue: '0'
                        }
                    }
                },
                '---',
                {
                    opcode: 'getAcceleration',
                    text: formatMessage({
                        id: 'microbit.acceleration',
                        default: '[AXIS] acceleration',
                        description: 'the latest acceleration value for the selected micro:bit axis'
                    }),
                    blockType: BlockType.REPORTER,
                    arguments: {
                        AXIS: {
                            type: ArgumentType.STRING,
                            menu: 'axis',
                            defaultValue: MicroBitAxis.X
                        }
                    }
                },
                {
                    opcode: 'getTemperature',
                    text: formatMessage({
                        id: 'microbit.temperature',
                        default: 'temperature',
                        description: 'the latest micro:bit temperature'
                    }),
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'getLightLevel',
                    text: formatMessage({
                        id: 'microbit.lightLevel',
                        default: 'light level',
                        description: 'the latest micro:bit light level'
                    }),
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'getRunningTime',
                    text: formatMessage({
                        id: 'microbit.runningTime',
                        default: 'running time',
                        description: 'the latest micro:bit running time in milliseconds'
                    }),
                    blockType: BlockType.REPORTER
                }
            ],
            menus: {
                buttons: {
                    acceptReporters: true,
                    items: this.BUTTONS_MENU
                },
                gestures: {
                    acceptReporters: true,
                    items: this.GESTURES_MENU
                },
                pinState: {
                    acceptReporters: true,
                    items: this.PIN_STATE_MENU
                },
                tiltDirection: {
                    acceptReporters: true,
                    items: this.TILT_DIRECTION_MENU
                },
                tiltDirectionAny: {
                    acceptReporters: true,
                    items: this.TILT_DIRECTION_ANY_MENU
                },
                touchPins: {
                    acceptReporters: true,
                    items: ['0', '1', '2']
                },
                pinValues: {
                    acceptReporters: true,
                    items: this.PIN_VALUE_MENU
                },
                axis: {
                    acceptReporters: true,
                    items: this.AXIS_MENU
                }
            }
        }];
    }

    /**
     * Test whether the A or B button is pressed
     * @param {object} args - the block's arguments.
     * @return {boolean} - true if the button is pressed.
     */
    whenButtonPressed (args) {
        if (args.BTN === 'any') {
            return this._peripheral.buttonA | this._peripheral.buttonB;
        } else if (args.BTN === 'A') {
            return this._peripheral.buttonA;
        } else if (args.BTN === 'B') {
            return this._peripheral.buttonB;
        }
        return false;
    }

    uploadBleFirmware () {
        this._peripheral.uploadFirmware();
    }

    /**
     * Test whether the A or B button is pressed
     * @param {object} args - the block's arguments.
     * @return {boolean} - true if the button is pressed.
     */
    isButtonPressed (args) {
        if (args.BTN === 'any') {
            return (this._peripheral.buttonA | this._peripheral.buttonB) !== 0;
        } else if (args.BTN === 'A') {
            return this._peripheral.buttonA !== 0;
        } else if (args.BTN === 'B') {
            return this._peripheral.buttonB !== 0;
        }
        return false;
    }

    /**
     * Test whether the micro:bit is moving
     * @param {object} args - the block's arguments.
     * @return {boolean} - true if the micro:bit is moving.
     */
    whenGesture (args) {
        const gesture = cast.toString(args.GESTURE);
        if (gesture === 'moved') {
            return (this._peripheral.gestureState >> 2) & 1;
        } else if (gesture === 'shaken') {
            return this._peripheral.gestureState & 1;
        } else if (gesture === 'jumped') {
            return (this._peripheral.gestureState >> 1) & 1;
        }
        return false;
    }

    /**
     * Display a predefined symbol on the 5x5 LED matrix.
     * @param {object} args - the block's arguments.
     * @return {Promise} - a Promise that resolves after a tick.
     */
    displaySymbol (args) {
        const symbol = cast.toString(args.MATRIX).replace(/\s/g, '');
        const reducer = (accumulator, c, index) => {
            const value = (c === '0') ? accumulator : accumulator + Math.pow(2, index);
            return value;
        };
        const hex = symbol.split('').reduce(reducer, 0);
        if (hex !== null) {
            this._peripheral.ledMatrixState[0] = hex & 0x1F;
            this._peripheral.ledMatrixState[1] = (hex >> 5) & 0x1F;
            this._peripheral.ledMatrixState[2] = (hex >> 10) & 0x1F;
            this._peripheral.ledMatrixState[3] = (hex >> 15) & 0x1F;
            this._peripheral.ledMatrixState[4] = (hex >> 20) & 0x1F;
            this._peripheral.displayMatrix(this._peripheral.ledMatrixState);
        }

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, BLESendInterval);
        });
    }

    /**
     * Display text on the 5x5 LED matrix.
     * @param {object} args - the block's arguments.
     * @return {Promise} - a Promise that resolves after the text is done printing.
     * Note the limit is 19 characters
     * The print time is calculated by multiplying the number of horizontal pixels
     * by the default scroll delay of 120ms.
     * The number of horizontal pixels = 6px for each character in the string,
     * 1px before the string, and 5px after the string.
     */
    displayText (args) {
        const text = String(args.TEXT).substring(0, 19);
        if (text.length > 0) this._peripheral.displayText(text);
        const yieldDelay = 120 * ((6 * text.length) + 6);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, yieldDelay);
        });
    }

    /**
     * Turn all 5x5 matrix LEDs off.
     * @return {Promise} - a Promise that resolves after a tick.
     */
    displayClear () {
        for (let i = 0; i < 5; i++) {
            this._peripheral.ledMatrixState[i] = 0;
        }
        this._peripheral.displayMatrix(this._peripheral.ledMatrixState);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, BLESendInterval);
        });
    }

    /**
     * Test whether the tilt sensor is currently tilted.
     * @param {object} args - the block's arguments.
     * @property {TiltDirection} DIRECTION - the tilt direction to test (front, back, left, right, or any).
     * @return {boolean} - true if the tilt sensor is tilted past a threshold in the specified direction.
     */
    whenTilted (args) {
        return this._isTilted(args.DIRECTION);
    }

    /**
     * Test whether the tilt sensor is currently tilted.
     * @param {object} args - the block's arguments.
     * @property {TiltDirection} DIRECTION - the tilt direction to test (front, back, left, right, or any).
     * @return {boolean} - true if the tilt sensor is tilted past a threshold in the specified direction.
     */
    isTilted (args) {
        return this._isTilted(args.DIRECTION);
    }

    /**
     * @param {object} args - the block's arguments.
     * @property {TiltDirection} DIRECTION - the direction (front, back, left, right) to check.
     * @return {number} - the tilt sensor's angle in the specified direction.
     * Note that getTiltAngle(front) = -getTiltAngle(back) and getTiltAngle(left) = -getTiltAngle(right).
     */
    getTiltAngle (args) {
        return this._getTiltAngle(args.DIRECTION);
    }

    /**
     * Test whether the tilt sensor is currently tilted.
     * @param {TiltDirection} direction - the tilt direction to test (front, back, left, right, or any).
     * @return {boolean} - true if the tilt sensor is tilted past a threshold in the specified direction.
     * @private
     */
    _isTilted (direction) {
        switch (direction) {
        case MicroBitTiltDirection.ANY:
            return (Math.abs(this._peripheral.tiltX / 10) >= Scratch3MicroBitBlocks.TILT_THRESHOLD) ||
                (Math.abs(this._peripheral.tiltY / 10) >= Scratch3MicroBitBlocks.TILT_THRESHOLD);
        default:
            return this._getTiltAngle(direction) >= Scratch3MicroBitBlocks.TILT_THRESHOLD;
        }
    }

    /**
     * @param {TiltDirection} direction - the direction (front, back, left, right) to check.
     * @return {number} - the tilt sensor's angle in the specified direction.
     * Note that getTiltAngle(front) = -getTiltAngle(back) and getTiltAngle(left) = -getTiltAngle(right).
     * @private
     */
    _getTiltAngle (direction) {
        switch (direction) {
        case MicroBitTiltDirection.FRONT:
            return Math.round(this._peripheral.tiltY / -10);
        case MicroBitTiltDirection.BACK:
            return Math.round(this._peripheral.tiltY / 10);
        case MicroBitTiltDirection.LEFT:
            return Math.round(this._peripheral.tiltX / -10);
        case MicroBitTiltDirection.RIGHT:
            return Math.round(this._peripheral.tiltX / 10);
        default:
            log.warn(`Unknown tilt direction in _getTiltAngle: ${direction}`);
        }
    }

    /**
     * @param {object} args - the block's arguments.
     * @return {boolean} - the touch pin state.
     * @private
     */
    whenPinConnected (args) {
        const pin = parseInt(args.PIN, 10);
        if (isNaN(pin)) return;
        if (pin < 0 || pin > 2) return false;
        return this._peripheral._checkPinState(pin);
    }

    /**
     * Test whether the selected touch pin is connected to ground.
     * @param {object} args - the block's arguments.
     * @return {boolean} - true if the touch pin is connected.
     */
    isPinConnected (args) {
        return this.getPinValue(args) !== 0;
    }

    /**
     * Get the latest touch pin value reported by the Scratch micro:bit BLE firmware.
     * @param {object} args - the block's arguments.
     * @return {number} - 1 when connected, otherwise 0.
     */
    getPinValue (args) {
        const pin = parseInt(args.PIN, 10);
        if (isNaN(pin)) return 0;
        if (pin < 0 || pin > 2) return 0;
        return this._peripheral._checkPinState(pin) ? 1 : 0;
    }

    /**
     * Set the selected micro:bit pin to digital value 0 or 1.
     * @param {object} args - the block's arguments.
     * @return {Promise} - a Promise that resolves after a tick.
     */
    setPinValue (args) {
        const pin = parseInt(args.PIN, 10);
        if (isNaN(pin) || pin < 0 || pin > 2) return;

        const value = cast.toNumber(args.VALUE) === 0 ? 0 : 1;

        return Promise.resolve(this._peripheral.setPinValue(pin, value))
            .then(() => {
                if (value === 0) {
                    return this._peripheral.clearPinConfig();
                }
            })
            .then(() => new Promise(resolve => {
                setTimeout(() => {
                    resolve();
                }, BLESendInterval);
            }));
    }

    /**
     * Set the selected micro:bit pin to PWM value 0..1023.
     * @param {object} args - the block's arguments.
     * @return {Promise} - a Promise that resolves after a tick.
     */
    setPwmValue (args) {
        const pin = parseInt(args.PIN, 10);
        if (isNaN(pin) || pin < 0 || pin > 2) return;

        const value = Math.max(0, Math.min(1023, cast.toNumber(args.VALUE)));
        return Promise.resolve(this._peripheral.setPwmValue(pin, value))
            .then(() => new Promise(resolve => {
                setTimeout(() => {
                    resolve();
                }, BLESendInterval);
            }));
    }

    /**
     * Get latest analog value for P0/P1/P2.
     * @param {object} args - the block's arguments.
     * @return {number} - analog value from 0 to 1023.
     */
    getAnalogPinValue (args) {
        const pin = parseInt(args.PIN, 10);
        if (isNaN(pin) || pin < 0 || pin > 2) return 0;
        return this._peripheral._readAnalogPin(pin);
    }

    /**
     * Get latest acceleration value for selected axis.
     * @param {object} args - the block's arguments.
     * @return {number} - acceleration in milli-g units as reported by micro:bit.
     */
    getAcceleration (args) {
        switch (cast.toString(args.AXIS)) {
        case MicroBitAxis.X:
            return this._peripheral.accelerationX;
        case MicroBitAxis.Y:
            return this._peripheral.accelerationY;
        case MicroBitAxis.Z:
            return this._peripheral.accelerationZ;
        default:
            return 0;
        }
    }

    /**
     * Get latest temperature.
     * @return {number} - temperature in celsius.
     */
    getTemperature () {
        return this._peripheral.temperature;
    }

    /**
     * Get latest display light level.
     * @return {number} - light level from 0 to 255.
     */
    getLightLevel () {
        return this._peripheral.lightLevel;
    }

    /**
     * Get latest running time.
     * @return {number} - running time in milliseconds.
     */
    getRunningTime () {
        return this._peripheral.runningTime;
    }
}

module.exports = Scratch3MicroBitBlocks;
