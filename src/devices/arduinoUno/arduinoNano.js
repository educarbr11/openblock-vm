/**
 * Arduino Nano
 *
 * @overview Compared to the Arduino Uno, this control board use CH340 as
 * use to uart chip, uese oldbootloader to flash the firmware, and there are
 * more A6 and A7 pin options.
 */
const OpenBlockArduinoUnoDevice = require('./arduinoUno');

const ArduinoPeripheral = require('../common/arduino-peripheral');

/**
 * The list of USB device filters.
 * @readonly
 */
const PNPID_LIST = [
    // Nano clones use many USB-serial chips. Some drivers do not report a
    // stable VID/PID, so show all serial ports and let the user pick the Nano.
    '*',
    // For chinese clones that use CH340
    'USB\\VID_1A86&PID_7523',
    // CH343 / newer WCH USB-serial adapters
    'USB\\VID_1A86&PID_55D3',
    // CH9102 / newer WCH USB-serial adapters
    'USB\\VID_1A86&PID_55D4',
    // PL2303 USB-serial adapters
    'USB\\VID_067B&PID_2303',
    // FTDI USB-serial adapters used by many classic Nano boards
    'USB\\VID_0403&PID_6001',
    'USB\\VID_0403&PID_6010',
    'USB\\VID_0403&PID_6015',
    // CP210x USB-serial adapters used by some Nano-compatible boards
    'USB\\VID_10C4&PID_EA60',
    // Official Arduino Nano variants
    'USB\\VID_2341&PID_0010',
    'USB\\VID_2341&PID_0051',
    'USB\\VID_2A03&PID_0010',
    'USB\\VID_2A03&PID_0051'
];

/**
 * Configuration of serialport
 * @readonly
 */
const SERIAL_CONFIG = {
    baudRate: 57600,
    dataBits: 8,
    stopBits: 1
};

/**
 * Configuration for arduino-cli.
 * @readonly
 */
const DIVECE_OPT = {
    type: 'arduino',
    fqbn: 'arduino:avr:nano',
    uploadFallbackFqbns: ['arduino:avr:nano:cpu=atmega328old'],
    firmware: 'arduinoUnoUltra.hex'
};

const Pins = {
    D0: '0',
    D1: '1',
    D2: '2',
    D3: '3',
    D4: '4',
    D5: '5',
    D6: '6',
    D7: '7',
    D8: '8',
    D9: '9',
    D10: '10',
    D11: '11',
    D12: '12',
    D13: '13',
    A0: 'A0',
    A1: 'A1',
    A2: 'A2',
    A3: 'A3',
    A4: 'A4',
    A5: 'A5',
    A6: 'A6',
    A7: 'A7'
};

/**
 * Manage communication with a Arduino Nano peripheral over a OpenBlock Link client socket.
 */
class ArduinoNano extends ArduinoPeripheral{
    /**
     * Construct a Arduino communication object.
     * @param {Runtime} runtime - the OpenBlock runtime
     * @param {string} deviceId - the id of the extension
     * @param {string} originalDeviceId - the original id of the peripheral, like xxx_arduinoUno
     */
    constructor (runtime, deviceId, originalDeviceId) {
        super(runtime, deviceId, originalDeviceId, PNPID_LIST, SERIAL_CONFIG, DIVECE_OPT);
    }
}

/**
  * OpenBlock blocks to interact with a Arduino Nano Ultra peripheral.
  */
class OpenBlockArduinoNanoDevice extends OpenBlockArduinoUnoDevice{

    /**
      * @return {string} - the ID of this extension.
      */
    get DEVICE_ID () {
        return 'arduinoNano';
    }

    get ANALOG_PINS_MENU () {
        return [
            {
                text: 'A0',
                value: Pins.A0
            },
            {
                text: 'A1',
                value: Pins.A1
            },
            {
                text: 'A2',
                value: Pins.A2
            },
            {
                text: 'A3',
                value: Pins.A3
            },
            {
                text: 'A4',
                value: Pins.A4
            },
            {
                text: 'A5',
                value: Pins.A5
            },
            {
                text: 'A6',
                value: Pins.A6
            },
            {
                text: 'A7',
                value: Pins.A7
            }
        ];
    }

    /**
     * Construct a set of Arduino blocks.
     * @param {Runtime} runtime - the OpenBlock runtime.
     * @param {string} originalDeviceId - the original id of the peripheral, like xxx_arduinoUno
     */
    constructor (runtime, originalDeviceId) {
        super(runtime, originalDeviceId);

        // Create a new Arduino Nano peripheral instance
        this._peripheral = new ArduinoNano(this.runtime, this.DEVICE_ID, originalDeviceId);
    }
}

module.exports = OpenBlockArduinoNanoDevice;
