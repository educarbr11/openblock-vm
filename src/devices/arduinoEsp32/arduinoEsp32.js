const formatMessage = require('format-message');

const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const ProgramModeType = require('../../extension-support/program-mode-type');

const CommonPeripheral = require('../common/common-peripheral');

/**
 * The list of USB device filters.
 * @readonly
 */
const PNPID_LIST = [
    // CH340
    'USB\\VID_1A86&PID_7523',
    // CH9102
    'USB\\VID_1A86&PID_55D4',
    // CP2102
    'USB\\VID_10C4&PID_EA60'
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
    // Upload Speed: "921600" for windows, "460800" for mac and linux
    // CPU Frequency: "240MHz (WiFi/BT)"
    // Flash Frequency: "80MHz"
    // Flash Mode: "QIO"
    // Flash Size: "4MB (32Mb)"
    // Partition Scheme: "Default 4MB with spiffs (1.2MB APP/1.5MB SPIFFS)"
    // Core Debug Level: "None"
    // PSRAM: "Disabled"
    // Arduino Runs On: "Core 1"
    // Events Run On: "Core 1"
    // Erase All Flash Before Sketch Upload: "Disabled"
    // JTAG Adapter: "Disabled"
    // Zigbee Mode: "Disabled"
    fqbn: {
        darwin: 'esp32:esp32:esp32:JTAGAdapter=default,PSRAM=disabled,PartitionScheme=default,CPUFreq=240,FlashMode=qio,FlashFreq=80,FlashSize=4M,UploadSpeed=460800,LoopCore=1,EventsCore=1,DebugLevel=none,EraseFlash=none,ZigbeeMode=default', // eslint-disable-line max-len
        linux: 'esp32:esp32:esp32:JTAGAdapter=default,PSRAM=disabled,PartitionScheme=default,CPUFreq=240,FlashMode=qio,FlashFreq=80,FlashSize=4M,UploadSpeed=460800,LoopCore=1,EventsCore=1,DebugLevel=none,EraseFlash=none,ZigbeeMode=default', // eslint-disable-line max-len
        win32: 'esp32:esp32:esp32:JTAGAdapter=default,PSRAM=disabled,PartitionScheme=default,CPUFreq=240,FlashMode=qio,FlashFreq=80,FlashSize=4M,UploadSpeed=921600,LoopCore=1,EventsCore=1,DebugLevel=none,EraseFlash=none,ZigbeeMode=default' // eslint-disable-line max-len
    }
};

const Pins = {
    IO0: '0',
    IO1: '1',
    IO2: '2',
    IO3: '3',
    IO4: '4',
    IO5: '5',
    IO6: '6',
    IO7: '7',
    IO8: '8',
    IO9: '9',
    IO10: '10',
    IO11: '11',
    IO12: '12',
    IO13: '13',
    IO14: '14',
    IO15: '15',
    IO16: '16',
    IO17: '17',
    IO18: '18',
    IO19: '19',
    IO21: '21',
    IO22: '22',
    IO23: '23',
    IO25: '25',
    IO26: '26',
    IO27: '27',
    IO32: '32',
    IO33: '33',
    IO34: '34',
    IO35: '35',
    IO36: '36',
    IO39: '39'
};

const Level = {
    High: 'HIGH',
    Low: 'LOW'
};

const SerialNo = {
    Serial0: '0',
    Serial1: '1',
    Serial2: '2'
};

const Buadrate = {
    B4800: '4800',
    B9600: '9600',
    B19200: '19200',
    B38400: '38400',
    B57600: '57600',
    B76800: '76800',
    B115200: '115200'
};

const Eol = {
    Warp: 'warp',
    NoWarp: 'noWarp'
};

const Mode = {
    Input: 'INPUT',
    Output: 'OUTPUT',
    InputPullup: 'INPUT_PULLUP',
    InputPulldown: 'INPUT_PULLDOWN'
};

const InterrupMode = {
    Rising: 'RISING',
    Falling: 'FALLING',
    Change: 'CHANGE',
    LowLevel: 'LOW',
    HighLevel: 'HIGH'
};

const DataType = {
    Integer: 'INTEGER',
    Decimal: 'DECIMAL',
    String: 'STRING'
};

const Note = {
    C3: '131',
    Db3: '139',
    D3: '147',
    Eb3: '156',
    E3: '165',
    F3: '175',
    Gb3: '185',
    G3: '196',
    Ab3: '208',
    A3: '220',
    Bb3: '233',
    B3: '247',
    C4: '262',
    Db4: '277',
    D4: '294',
    Eb4: '311',
    E4: '330',
    F4: '349',
    Gb4: '370',
    G4: '392',
    Ab4: '415',
    A4: '440',
    Bb4: '466',
    B4: '494',
    C5: '523',
    Db5: '554',
    D5: '587',
    Eb5: '622',
    E5: '659',
    F5: '698',
    Gb5: '740',
    G5: '784',
    Ab5: '831',
    A5: '880',
    Bb5: '932',
    B5: '988'
};

const BeatTime = {
    One: '1',
    Half: '0.5',
    Quarter: '0.25',
    Eighth: '0.125',
    Sixteenth: '0.0625',
    Double: '2',
    Quadruple: '4'
};

const DistanceUnit = {
    Cm: 'CM',
    Inch: 'INC'
};

/**
 * Manage communication with a Arduino esp32 peripheral over a OpenBlock Link client socket.
 */
class ArduinoEsp32 extends CommonPeripheral{
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
 * OpenBlock blocks to interact with a Arduino esp32 peripheral.
 */
class OpenBlockArduinoEsp32Device {
    /**
     * @return {string} - the ID of this extension.
     */
    get DEVICE_ID () {
        return 'arduinoEsp32';
    }

    get PINS_MENU () {
        return [
            {
                text: 'IO0',
                value: Pins.IO0
            },
            {
                text: 'IO1',
                value: Pins.IO1
            },
            {
                text: 'IO2',
                value: Pins.IO2
            },
            {
                text: 'IO3',
                value: Pins.IO3
            },
            {
                text: 'IO4',
                value: Pins.IO4
            },
            {
                text: 'IO5',
                value: Pins.IO5
            },
            // Pins 6 to 11 are used by the ESP32 Flash, not recommended for general use.
            // {
            //     text: 'IO6',
            //     value: Pins.IO6
            // },
            // {
            //     text: 'IO7',
            //     value: Pins.IO7
            // },
            // {
            //     text: 'IO8',
            //     value: Pins.IO8
            // },
            // {
            //     text: 'IO9',
            //     value: Pins.IO9
            // },
            // {
            //     text: 'IO10',
            //     value: Pins.IO10
            // },
            // {
            //     text: 'IO11',
            //     value: Pins.IO11
            // },
            {
                text: 'IO12',
                value: Pins.IO12
            },
            {
                text: 'IO13',
                value: Pins.IO13
            },
            {
                text: 'IO14',
                value: Pins.IO14
            },
            {
                text: 'IO15',
                value: Pins.IO15
            },
            {
                text: 'IO16',
                value: Pins.IO16
            },
            {
                text: 'IO17',
                value: Pins.IO17
            },
            {
                text: 'IO18',
                value: Pins.IO18
            },
            {
                text: 'IO19',
                value: Pins.IO19
            },
            {
                text: 'IO21',
                value: Pins.IO21
            },
            {
                text: 'IO22',
                value: Pins.IO22
            },
            {
                text: 'IO23',
                value: Pins.IO23
            },
            {
                text: 'IO25',
                value: Pins.IO25
            },
            {
                text: 'IO26',
                value: Pins.IO26
            },
            {
                text: 'IO27',
                value: Pins.IO27
            },
            {
                text: 'IO32',
                value: Pins.IO32
            },
            {
                text: 'IO33',
                value: Pins.IO33
            },
            {
                text: 'IO34',
                value: Pins.IO34
            },
            {
                text: 'IO35',
                value: Pins.IO35
            },
            {
                text: 'IO36',
                value: Pins.IO36
            },
            {
                text: 'IO39',
                value: Pins.IO39
            }
        ];
    }

    get OUT_PINS_MENU () {
        return [
            {
                text: 'IO0',
                value: Pins.IO0
            },
            {
                text: 'IO1',
                value: Pins.IO1
            },
            {
                text: 'IO2',
                value: Pins.IO2
            },
            {
                text: 'IO3',
                value: Pins.IO3
            },
            {
                text: 'IO4',
                value: Pins.IO4
            },
            {
                text: 'IO5',
                value: Pins.IO5
            },
            // Pins 6 to 11 are used by the ESP32 Flash, not recommended for general use.
            // {
            //     text: 'IO6',
            //     value: Pins.IO6
            // },
            // {
            //     text: 'IO7',
            //     value: Pins.IO7
            // },
            // {
            //     text: 'IO8',
            //     value: Pins.IO8
            // },
            // {
            //     text: 'IO9',
            //     value: Pins.IO9
            // },
            // {
            //     text: 'IO10',
            //     value: Pins.IO10
            // },
            // {
            //     text: 'IO11',
            //     value: Pins.IO11
            // },
            {
                text: 'IO12',
                value: Pins.IO12
            },
            {
                text: 'IO13',
                value: Pins.IO13
            },
            {
                text: 'IO14',
                value: Pins.IO14
            },
            {
                text: 'IO15',
                value: Pins.IO15
            },
            {
                text: 'IO16',
                value: Pins.IO16
            },
            {
                text: 'IO17',
                value: Pins.IO17
            },
            {
                text: 'IO18',
                value: Pins.IO18
            },
            {
                text: 'IO19',
                value: Pins.IO19
            },
            {
                text: 'IO21',
                value: Pins.IO21
            },
            {
                text: 'IO22',
                value: Pins.IO22
            },
            {
                text: 'IO23',
                value: Pins.IO23
            },
            {
                text: 'IO25',
                value: Pins.IO25
            },
            {
                text: 'IO26',
                value: Pins.IO26
            },
            {
                text: 'IO27',
                value: Pins.IO27
            },
            {
                text: 'IO32',
                value: Pins.IO32
            },
            {
                text: 'IO33',
                value: Pins.IO33
            }
        ];
    }

    get MODE_MENU () {
        return [
            {
                text: formatMessage({
                    id: 'arduinoEsp32.modeMenu.input',
                    default: 'input',
                    description: 'label for input pin mode'
                }),
                value: Mode.Input
            },
            {
                text: formatMessage({
                    id: 'arduinoEsp32.modeMenu.output',
                    default: 'output',
                    description: 'label for output pin mode'
                }),
                value: Mode.Output
            },
            {
                text: formatMessage({
                    id: 'arduinoEsp32.modeMenu.inputPullup',
                    default: 'input-pullup',
                    description: 'label for input-pullup pin mode'
                }),
                value: Mode.InputPullup
            },
            {
                text: formatMessage({
                    id: 'arduinoEsp32.modeMenu.inputPulldown',
                    default: 'input-pulldown',
                    description: 'label for input-pulldown pin mode'
                }),
                value: Mode.InputPulldown
            }
        ];
    }

    get ANALOG_PINS_MENU () {
        return [
            {
                text: 'IO0',
                value: Pins.IO0
            },
            {
                text: 'IO2',
                value: Pins.IO2
            },
            {
                text: 'IO4',
                value: Pins.IO4
            },
            {
                text: 'IO12',
                value: Pins.IO12
            },
            {
                text: 'IO13',
                value: Pins.IO13
            },
            {
                text: 'IO14',
                value: Pins.IO14
            },
            {
                text: 'IO15',
                value: Pins.IO15
            },
            {
                text: 'IO25',
                value: Pins.IO25
            },
            {
                text: 'IO26',
                value: Pins.IO26
            },
            {
                text: 'IO27',
                value: Pins.IO27
            },
            {
                text: 'IO32',
                value: Pins.IO32
            },
            {
                text: 'IO33',
                value: Pins.IO33
            },
            {
                text: 'IO34',
                value: Pins.IO34
            },
            {
                text: 'IO35',
                value: Pins.IO35
            },
            {
                text: 'IO36',
                value: Pins.IO36
            },
            {
                text: 'IO39',
                value: Pins.IO39
            }
        ];
    }

    get LEVEL_MENU () {
        return [
            {
                text: formatMessage({
                    id: 'arduinoEsp32.levelMenu.high',
                    default: 'high',
                    description: 'label for high level'
                }),
                value: Level.High
            },
            {
                text: formatMessage({
                    id: 'arduinoEsp32.levelMenu.low',
                    default: 'low',
                    description: 'label for low level'
                }),
                value: Level.Low
            }
        ];
    }

    get DAC_PINS_MENU () {
        return [
            {
                text: 'IO25',
                value: Pins.IO25
            },
            {
                text: 'IO26',
                value: Pins.IO26
            }
        ];
    }

    get TOUCH_PINS_MENU () {
        return [
            {
                text: 'IO0',
                value: Pins.IO0
            },
            {
                text: 'IO2',
                value: Pins.IO2
            },
            {
                text: 'IO4',
                value: Pins.IO4
            },
            {
                text: 'IO12',
                value: Pins.IO12
            },
            {
                text: 'IO13',
                value: Pins.IO13
            },
            {
                text: 'IO14',
                value: Pins.IO14
            },
            {
                text: 'IO15',
                value: Pins.IO15
            },
            {
                text: 'IO27',
                value: Pins.IO27
            },
            {
                text: 'IO32',
                value: Pins.IO32
            },
            {
                text: 'IO33',
                value: Pins.IO33
            }
        ];
    }

    get INTERRUP_MODE_MENU () {
        return [
            {
                text: formatMessage({
                    id: 'arduinoEsp32.InterrupModeMenu.risingEdge',
                    default: 'rising edge',
                    description: 'label for rising edge interrup'
                }),
                value: InterrupMode.Rising
            },
            {
                text: formatMessage({
                    id: 'arduinoEsp32.InterrupModeMenu.fallingEdge',
                    default: 'falling edge',
                    description: 'label for falling edge interrup'
                }),
                value: InterrupMode.Falling
            },
            {
                text: formatMessage({
                    id: 'arduinoEsp32.InterrupModeMenu.changeEdge',
                    default: 'change edge',
                    description: 'label for change edge interrup'
                }),
                value: InterrupMode.Change
            },
            {
                text: formatMessage({
                    id: 'arduinoEsp32.InterrupModeMenu.low',
                    default: 'low level',
                    description: 'label for low level interrup'
                }),
                value: InterrupMode.LowLevel
            },
            {
                text: formatMessage({
                    id: 'arduinoEsp32.InterrupModeMenu.high',
                    default: 'high level',
                    description: 'label for high level interrup'
                }),
                value: InterrupMode.HighLevel
            }
        ];
    }

    get SERIAL_NO_MENU () {
        return [
            {
                text: '0',
                value: SerialNo.Serial0
            },
            {
                text: '1',
                value: SerialNo.Serial1
            },
            {
                text: '2',
                value: SerialNo.Serial2
            }
        ];
    }

    get BAUDTATE_MENU () {
        return [
            {
                text: '4800',
                value: Buadrate.B4800
            },
            {
                text: '9600',
                value: Buadrate.B9600
            },
            {
                text: '19200',
                value: Buadrate.B19200
            },
            {
                text: '38400',
                value: Buadrate.B38400
            },
            {
                text: '57600',
                value: Buadrate.B57600
            },
            {
                text: '76800',
                value: Buadrate.B76800
            },
            {
                text: '115200',
                value: Buadrate.B115200
            }
        ];
    }

    get EOL_MENU () {
        return [
            {
                text: formatMessage({
                    id: 'arduinoEsp32.eolMenu.warp',
                    default: 'warp',
                    description: 'label for warp print'
                }),
                value: Eol.Warp
            },
            {
                text: formatMessage({
                    id: 'arduinoEsp32.eolMenu.noWarp',
                    default: 'no-warp',
                    description: 'label for no warp print'
                }),
                value: Eol.NoWarp
            }
        ];
    }
    get NOTE_MENU () {
        return [
            {text: 'C3', value: Note.C3},
            {text: 'C#3', value: Note.Db3},
            {text: 'D3', value: Note.D3},
            {text: 'D#3', value: Note.Eb3},
            {text: 'E3', value: Note.E3},
            {text: 'F3', value: Note.F3},
            {text: 'F#3', value: Note.Gb3},
            {text: 'G3', value: Note.G3},
            {text: 'G#3', value: Note.Ab3},
            {text: 'A3', value: Note.A3},
            {text: 'A#3', value: Note.Bb3},
            {text: 'B3', value: Note.B3},
            {text: 'C4', value: Note.C4},
            {text: 'C#4', value: Note.Db4},
            {text: 'D4', value: Note.D4},
            {text: 'D#4', value: Note.Eb4},
            {text: 'E4', value: Note.E4},
            {text: 'F4', value: Note.F4},
            {text: 'F#4', value: Note.Gb4},
            {text: 'G4', value: Note.G4},
            {text: 'G#4', value: Note.Ab4},
            {text: 'A4', value: Note.A4},
            {text: 'A#4', value: Note.Bb4},
            {text: 'B4', value: Note.B4},
            {text: 'C5', value: Note.C5},
            {text: 'C#5', value: Note.Db5},
            {text: 'D5', value: Note.D5},
            {text: 'D#5', value: Note.Eb5},
            {text: 'E5', value: Note.E5},
            {text: 'F5', value: Note.F5},
            {text: 'F#5', value: Note.Gb5},
            {text: 'G5', value: Note.G5},
            {text: 'G#5', value: Note.Ab5},
            {text: 'A5', value: Note.A5},
            {text: 'A#5', value: Note.Bb5},
            {text: 'B5', value: Note.B5}
        ];
    }

    get BEAT_TIME_MENU () {
        return [
            {text: '1', value: BeatTime.One},
            {text: '1/2', value: BeatTime.Half},
            {text: '1/4', value: BeatTime.Quarter},
            {text: '1/8', value: BeatTime.Eighth},
            {text: '1/16', value: BeatTime.Sixteenth},
            {text: '2', value: BeatTime.Double},
            {text: '4', value: BeatTime.Quadruple}
        ];
    }

    get DISTANCE_UNIT_MENU () {
        return [
            {
                text: formatMessage({
                    id: 'arduinoEsp32.distanceUnitMenu.cm',
                    default: 'cm',
                    description: 'label for centimeters unit'
                }),
                value: DistanceUnit.Cm
            },
            {
                text: formatMessage({
                    id: 'arduinoEsp32.distanceUnitMenu.inch',
                    default: 'inch',
                    description: 'label for inches unit'
                }),
                value: DistanceUnit.Inch
            }
        ];
    }

    get DATA_TYPE_MENU () {
        return [
            {
                text: formatMessage({
                    id: 'arduinoEsp32.dataTypeMenu.integer',
                    default: 'integer',
                    description: 'label for integer'
                }),
                value: DataType.Integer
            },
            {
                text: formatMessage({
                    id: 'arduinoEsp32.dataTypeMenu.decimal',
                    default: 'decimal',
                    description: 'label for decimal number'
                }),
                value: DataType.Decimal
            },
            {
                text: formatMessage({
                    id: 'arduinoEsp32.dataTypeMenu.string',
                    default: 'string',
                    description: 'label for string'
                }),
                value: DataType.String
            }
        ];
    }

    /**
     * Construct a set of Arduino blocks.
     * @param {Runtime} runtime - the OpenBlock runtime.
     * @param {string} originalDeviceId - the original id of the peripheral, like xxx_arduinoUno
     */
    constructor (runtime, originalDeviceId) {
        /**
         * The OpenBlock runtime.
         * @type {Runtime}
         */
        this.runtime = runtime;

        // Create a new Arduino esp32 peripheral instance
        this._peripheral = new ArduinoEsp32(this.runtime, this.DEVICE_ID, originalDeviceId);
    }

    /**
     * @returns {Array.<object>} metadata for this extension and its blocks.
     */
    getInfo () {
        return [
            {
                id: 'pin',
                name: formatMessage({
                    id: 'arduinoEsp32.category.pins',
                    default: 'Pins',
                    description: 'The name of the esp32 arduino device pin category'
                }),
                color1: '#4C97FF',
                color2: '#3373CC',
                color3: '#3373CC',

                blocks: [
                    {
                        opcode: 'setDigitalOutput',
                        text: formatMessage({
                            id: 'arduinoEsp32.pins.setDigitalOutput',
                            default: 'set digital pin [PIN] out [LEVEL]',
                            description: 'arduinoEsp32 set digital pin out'
                        }),
                        blockType: BlockType.COMMAND,
                        arguments: {
                            PIN: {
                                type: ArgumentType.STRING,
                                menu: 'outPins',
                                defaultValue: Pins.IO4
                            },
                            LEVEL: {
                                type: ArgumentType.STRING,
                                menu: 'level',
                                defaultValue: Level.High
                            }
                        }
                    },
                    {
                        opcode: 'esp32SetPwmOutput',
                        text: formatMessage({
                            id: 'arduinoEsp32.pins.esp32SetPwmOutput',
                            default: 'set pwm pin [PIN] out [OUT]',
                            description: 'arduinoEsp32 set pwm pin out'
                        }),
                        blockType: BlockType.COMMAND,
                        arguments: {
                            PIN: {
                                type: ArgumentType.STRING,
                                menu: 'outPins',
                                defaultValue: Pins.IO4
                            },
                            OUT: {
                                type: ArgumentType.UINT8_NUMBER,
                                defaultValue: '255'
                            }
                        }
                    },
                    {

                        opcode: 'esp32SetDACOutput',
                        text: formatMessage({
                            id: 'arduinoEsp32.pins.esp32SetDACOutput',
                            default: 'set dac pin [PIN] out [OUT]',
                            description: 'arduinoEsp32 set dac pin out'
                        }),
                        blockType: BlockType.COMMAND,
                        arguments: {
                            PIN: {
                                type: ArgumentType.STRING,
                                menu: 'dacPins',
                                defaultValue: Pins.IO25
                            },
                            OUT: {
                                type: ArgumentType.UINT8_NUMBER,
                                defaultValue: '0'
                            }
                        }
                    },
                    '---',
                    {
                        opcode: 'readDigitalPin',
                        text: formatMessage({
                            id: 'arduinoEsp32.pins.readDigitalPin',
                            default: 'read digital pin [PIN]',
                            description: 'arduinoEsp32 read digital pin'
                        }),
                        blockType: BlockType.BOOLEAN,
                        arguments: {
                            PIN: {
                                type: ArgumentType.STRING,
                                menu: 'pins',
                                defaultValue: Pins.IO4
                            }
                        }
                    },
                    {
                        opcode: 'readAnalogPin',
                        text: formatMessage({
                            id: 'arduinoEsp32.pins.readAnalogPin',
                            default: 'read analog pin [PIN]',
                            description: 'arduinoEsp32 read analog pin'
                        }),
                        blockType: BlockType.REPORTER,
                        arguments: {
                            PIN: {
                                type: ArgumentType.STRING,
                                menu: 'analogPins',
                                defaultValue: Pins.IO4
                            }
                        }
                    },
                    {
                        opcode: 'esp32ReadTouchPin',
                        text: formatMessage({
                            id: 'arduinoEsp32.pins.esp32ReadTouchPin',
                            default: 'read touch pin [PIN]',
                            description: 'arduinoEsp32 read touch pin'
                        }),
                        blockType: BlockType.REPORTER,
                        arguments: {
                            PIN: {
                                type: ArgumentType.STRING,
                                menu: 'touchPins',
                                defaultValue: Pins.IO4
                            }
                        }
                    },
                    '---',
                    {

                        opcode: 'esp32SetServoOutput',
                        text: formatMessage({
                            id: 'arduinoEsp32.pins.esp32SetServoOutput',
                            default: 'set servo pin [PIN] out [OUT]',
                            description: 'arduinoEsp32 set servo pin out'
                        }),
                        blockType: BlockType.COMMAND,
                        arguments: {
                            PIN: {
                                type: ArgumentType.STRING,
                                menu: 'outPins',
                                defaultValue: Pins.IO4
                            },
                            OUT: {
                                type: ArgumentType.HALF_ANGLE,
                                defaultValue: '90'
                            }
                        }
                    },
                    '---',
                    {
                        opcode: 'playToneForSeconds',
                        text: formatMessage({
                            id: 'arduinoEsp32.pins.playToneForSeconds',
                            default: 'play sound on pin [PIN] note [NOTE] for [SECONDS] seconds',
                            description: 'arduinoEsp32 play tone for seconds'
                        }),
                        blockType: BlockType.COMMAND,
                        arguments: {
                            PIN: {
                                type: ArgumentType.STRING,
                                menu: 'outPins',
                                defaultValue: Pins.IO4
                            },
                            NOTE: {
                                type: ArgumentType.NUMBER,
                                menu: 'note',
                                defaultValue: Note.C4
                            },
                            SECONDS: {
                                type: ArgumentType.NUMBER,
                                defaultValue: '0.5'
                            }
                        }
                    },
                    {
                        opcode: 'playToneForBeat',
                        text: formatMessage({
                            id: 'arduinoEsp32.pins.playToneForBeat',
                            default: 'play sound on pin [PIN] note [NOTE] for [BEAT] beat',
                            description: 'arduinoEsp32 play tone for beat'
                        }),
                        blockType: BlockType.COMMAND,
                        arguments: {
                            PIN: {
                                type: ArgumentType.STRING,
                                menu: 'outPins',
                                defaultValue: Pins.IO4
                            },
                            NOTE: {
                                type: ArgumentType.NUMBER,
                                menu: 'note',
                                defaultValue: Note.C4
                            },
                            BEAT: {
                                type: ArgumentType.STRING,
                                menu: 'beatTime',
                                defaultValue: BeatTime.Half
                            }
                        }
                    },
                    {
                        opcode: 'stopTone',
                        text: formatMessage({
                            id: 'arduinoEsp32.pins.stopTone',
                            default: 'stop sound on pin [PIN]',
                            description: 'arduinoEsp32 stop tone'
                        }),
                        blockType: BlockType.COMMAND,
                        arguments: {
                            PIN: {
                                type: ArgumentType.STRING,
                                menu: 'outPins',
                                defaultValue: Pins.IO4
                            }
                        }
                    },
                    {
                        opcode: 'readUltrasonicDistance',
                        text: formatMessage({
                            id: 'arduinoEsp32.pins.readUltrasonicDistance',
                            default: 'read ultrasonic distance TRIG [TRIG] ECHO [ECHO] in [UNIT]',
                            description: 'arduinoEsp32 read ultrasonic distance'
                        }),
                        blockType: BlockType.REPORTER,
                        arguments: {
                            TRIG: {
                                type: ArgumentType.STRING,
                                menu: 'outPins',
                                defaultValue: Pins.IO4
                            },
                            ECHO: {
                                type: ArgumentType.STRING,
                                menu: 'outPins',
                                defaultValue: Pins.IO5
                            },
                            UNIT: {
                                type: ArgumentType.STRING,
                                menu: 'distanceUnit',
                                defaultValue: DistanceUnit.Cm
                            }
                        }
                    },
                    '---',
                    {

                        opcode: 'esp32AttachInterrupt',
                        text: formatMessage({
                            id: 'arduinoEsp32.pins.esp32AttachInterrupt',
                            default: 'attach interrupt pin [PIN] mode [MODE] executes',
                            description: 'arduinoEsp32 attach interrupt'
                        }),
                        blockType: BlockType.CONDITIONAL,
                        arguments: {
                            PIN: {
                                type: ArgumentType.STRING,
                                menu: 'pins',
                                defaultValue: Pins.IO4
                            },
                            MODE: {
                                type: ArgumentType.STRING,
                                menu: 'interruptMode',
                                defaultValue: InterrupMode.Rising
                            }
                        },
                        programMode: [ProgramModeType.UPLOAD]
                    },
                    {

                        opcode: 'esp32DetachInterrupt',
                        text: formatMessage({
                            id: 'arduinoEsp32.pins.esp32DetachInterrupt',
                            default: 'detach interrupt pin [PIN]',
                            description: 'arduinoEsp32 detach interrupt'
                        }),
                        blockType: BlockType.COMMAND,
                        arguments: {
                            PIN: {
                                type: ArgumentType.STRING,
                                menu: 'pins',
                                defaultValue: Pins.IO4
                            }
                        },
                        programMode: [ProgramModeType.UPLOAD]
                    }
                ],
                menus: {
                    pins: {
                        acceptReporters: true,
                        items: this.PINS_MENU
                    },
                    outPins: {
                        acceptReporters: true,
                        items: this.OUT_PINS_MENU
                    },
                    mode: {
                        items: this.MODE_MENU
                    },
                    analogPins: {
                        acceptReporters: true,
                        items: this.ANALOG_PINS_MENU
                    },
                    level: {
                        acceptReporters: true,
                        items: this.LEVEL_MENU
                    },
                    dacPins: {
                        acceptReporters: true,
                        items: this.DAC_PINS_MENU
                    },
                    touchPins: {
                        acceptReporters: true,
                        items: this.TOUCH_PINS_MENU
                    },
                    interruptMode: {
                        items: this.INTERRUP_MODE_MENU
                    },
                    note: {
                        acceptReporters: true,
                        items: this.NOTE_MENU
                    },
                    beatTime: {
                        items: this.BEAT_TIME_MENU
                    },
                    distanceUnit: {
                        items: this.DISTANCE_UNIT_MENU
                    }
                }
            },
            {
                id: 'serial',
                name: formatMessage({
                    id: 'arduinoEsp32.category.serial',
                    default: 'Serial',
                    description: 'The name of the arduino esp32 device serial category'
                }),
                color1: '#9966FF',
                color2: '#774DCB',
                color3: '#774DCB',

                blocks: [
                    {
                        opcode: 'multiSerialBegin',
                        text: formatMessage({
                            id: 'arduinoEsp32.serial.multiSerialBegin',
                            default: 'serial [NO] begin baudrate [VALUE]',
                            description: 'arduinoEsp32 multi serial begin'
                        }),
                        blockType: BlockType.COMMAND,
                        arguments: {
                            NO: {
                                type: ArgumentType.NUMBER,
                                menu: 'serialNo',
                                defaultValue: SerialNo.Serial0
                            },
                            VALUE: {
                                type: ArgumentType.STRING,
                                menu: 'baudrate',
                                defaultValue: Buadrate.B115200
                            }
                        },
                        programMode: [ProgramModeType.UPLOAD]
                    },
                    {
                        opcode: 'multiSerialPrint',
                        text: formatMessage({
                            id: 'arduinoEsp32.serial.multiSerialPrint',
                            default: 'serial [NO] print [VALUE] [EOL]',
                            description: 'arduinoEsp32 multi serial print'
                        }),
                        blockType: BlockType.COMMAND,
                        arguments: {
                            NO: {
                                type: ArgumentType.NUMBER,
                                menu: 'serialNo',
                                defaultValue: SerialNo.Serial0
                            },
                            VALUE: {
                                type: ArgumentType.STRING,
                                defaultValue: 'Hello OpenBlock'
                            },
                            EOL: {
                                type: ArgumentType.STRING,
                                menu: 'eol',
                                defaultValue: Eol.Warp
                            }
                        },
                        programMode: [ProgramModeType.UPLOAD]
                    },
                    {
                        opcode: 'multiSerialAvailable',
                        text: formatMessage({
                            id: 'arduinoEsp32.serial.multiSerialAvailable',
                            default: 'serial [NO] available data length',
                            description: 'arduinoEsp32 multi serial available data length'
                        }),
                        arguments: {
                            NO: {
                                type: ArgumentType.NUMBER,
                                menu: 'serialNo',
                                defaultValue: SerialNo.Serial0
                            }
                        },
                        blockType: BlockType.REPORTER,
                        programMode: [ProgramModeType.UPLOAD]
                    },
                    {
                        opcode: 'multiSerialReadAByte',
                        text: formatMessage({
                            id: 'arduinoEsp32.serial.multiSerialReadAByte',
                            default: 'serial [NO] read a byte',
                            description: 'arduinoEsp32 multi serial read a byte'
                        }),
                        arguments: {
                            NO: {
                                type: ArgumentType.NUMBER,
                                menu: 'serialNo',
                                defaultValue: SerialNo.Serial0
                            }
                        },
                        blockType: BlockType.REPORTER,
                        programMode: [ProgramModeType.UPLOAD]
                    }
                ],
                menus: {
                    baudrate: {
                        items: this.BAUDTATE_MENU
                    },
                    serialNo: {
                        items: this.SERIAL_NO_MENU
                    },
                    eol: {
                        items: this.EOL_MENU
                    }
                }
            },
            {
                id: 'data',
                name: formatMessage({
                    id: 'arduinoEsp32.category.data',
                    default: 'Data',
                    description: 'The name of the arduino esp32 device data category'
                }),
                color1: '#CF63CF',
                color2: '#C94FC9',
                color3: '#BD42BD',

                blocks: [
                    {
                        opcode: 'dataMap',
                        text: formatMessage({
                            id: 'arduinoEsp32.data.dataMap',
                            default: 'map [DATA] from ([ARG0], [ARG1]) to ([ARG2], [ARG3])',
                            description: 'arduinoEsp32 data map'
                        }),
                        blockType: BlockType.REPORTER,
                        arguments: {
                            DATA: {
                                type: ArgumentType.NUMBER,
                                defaultValue: '50'
                            },
                            ARG0: {
                                type: ArgumentType.NUMBER,
                                defaultValue: '1'
                            },
                            ARG1: {
                                type: ArgumentType.NUMBER,
                                defaultValue: '100'
                            },
                            ARG2: {
                                type: ArgumentType.NUMBER,
                                defaultValue: '1'
                            },
                            ARG3: {
                                type: ArgumentType.NUMBER,
                                defaultValue: '1000'
                            }
                        },
                        programMode: [ProgramModeType.UPLOAD]
                    },
                    {
                        opcode: 'dataConstrain',
                        text: formatMessage({
                            id: 'arduinoEsp32.data.dataConstrain',
                            default: 'constrain [DATA] between ([ARG0], [ARG1])',
                            description: 'arduinoEsp32 data constrain'
                        }),
                        blockType: BlockType.REPORTER,
                        arguments: {
                            DATA: {
                                type: ArgumentType.NUMBER,
                                defaultValue: '50'
                            },
                            ARG0: {
                                type: ArgumentType.NUMBER,
                                defaultValue: '1'
                            },
                            ARG1: {
                                type: ArgumentType.NUMBER,
                                defaultValue: '100'
                            }
                        },
                        programMode: [ProgramModeType.UPLOAD]
                    },
                    '---',
                    {
                        opcode: 'dataConvert',
                        text: formatMessage({
                            id: 'arduinoEsp32.data.dataConvert',
                            default: 'convert [DATA] to [TYPE]',
                            description: 'arduinoEsp32 data convert'
                        }),
                        blockType: BlockType.REPORTER,
                        arguments: {
                            DATA: {
                                type: ArgumentType.STRING,
                                defaultValue: '123'
                            },
                            TYPE: {
                                type: ArgumentType.STRING,
                                menu: 'dataType',
                                defaultValue: DataType.Integer
                            }
                        },
                        programMode: [ProgramModeType.UPLOAD]
                    },
                    {
                        opcode: 'dataConvertASCIICharacter',
                        text: formatMessage({
                            id: 'arduinoEsp32.data.dataConvertASCIICharacter',
                            default: 'convert [DATA] to ASCII character',
                            description: 'arduinoEsp32 data convert to ASCII character'
                        }),
                        blockType: BlockType.REPORTER,
                        arguments: {
                            DATA: {
                                type: ArgumentType.NUMBER,
                                defaultValue: '97'
                            }
                        },
                        programMode: [ProgramModeType.UPLOAD]
                    },
                    {
                        opcode: 'dataConvertASCIINumber',
                        text: formatMessage({
                            id: 'arduinoEsp32.data.dataConvertASCIINumber',
                            default: 'convert [DATA] to ASCII nubmer',
                            description: 'arduinoEsp32 data convert to ASCII nubmer'
                        }),
                        blockType: BlockType.REPORTER,
                        arguments: {
                            DATA: {
                                type: ArgumentType.STRING,
                                defaultValue: 'a'
                            }
                        },
                        programMode: [ProgramModeType.UPLOAD]
                    }
                ],
                menus: {
                    dataType: {
                        items: this.DATA_TYPE_MENU
                    }
                }
            }
        ];
    }

    /**
     * Set pin mode.
     * @param {object} args - the block's arguments.
     * @return {Promise} - a Promise that resolves after the set pin mode is done.
     */
    setPinMode (args) {
        this._peripheral.setPinMode(args.PIN, args.MODE);
        return Promise.resolve();
    }

    /**
     * Set pin digital out level.
     * @param {object} args - the block's arguments.
     * @return {Promise} - a Promise that resolves after the set pin digital out level is done.
     */
    setDigitalOutput (args) {
        this._peripheral.setDigitalOutput(args.PIN, args.LEVEL);
        return Promise.resolve();
    }

    /**
     * Set pin pwm out value.
     * @param {object} args - the block's arguments.
     * @return {Promise} - a Promise that resolves after the set pin pwm out value is done.
     */
    setPwmOutput (args) {
        this._peripheral.setPwmOutput(args.PIN, args.OUT);
        return Promise.resolve();
    }

    /**
     * Read pin digital level.
     * @param {object} args - the block's arguments.
     * @return {boolean} - true if read high level, false if read low level.
     */
    readDigitalPin (args) {
        return this._peripheral.readDigitalPin(args.PIN);
    }

    /**
     * Read analog pin.
     * @param {object} args - the block's arguments.
     * @return {number} - analog value fo the pin.
     */
    readAnalogPin (args) {
        return this._peripheral.readAnalogPin(args.PIN);
    }

    /**
     * Set servo out put.
     * @param {object} args - the block's arguments.
     * @return {Promise} - a Promise that resolves after the set servo out value is done.
     */
    setServoOutput (args) {
        this._peripheral.setServoOutput(args.PIN, args.OUT);
        return Promise.resolve();
    }

    /**
     * Play buzzer tone for seconds.
     * @param {object} args - the block's arguments.
     * @return {Promise} - a Promise that resolves after the tone is done.
     */
    playToneForSeconds (args) {
        return this._peripheral.playToneForSeconds(args.PIN, args.NOTE, args.SECONDS);
    }

    /**
     * Play buzzer tone for musical beat length. One beat is 0.5 seconds.
     * @param {object} args - the block's arguments.
     * @return {Promise} - a Promise that resolves after the tone is done.
     */
    playToneForBeat (args) {
        return this._peripheral.playToneForSeconds(args.PIN, args.NOTE, parseFloat(args.BEAT) * 0.5);
    }

    /**
     * Stop buzzer tone.
     * @param {object} args - the block's arguments.
     * @return {Promise} - a Promise that resolves after the tone is stopped.
     */
    stopTone (args) {
        this._peripheral.stopTone(args.PIN);
        return Promise.resolve();
    }

    /**
     * Read ultrasonic distance.
     * @param {object} args - the block's arguments.
     * @return {Promise} - a Promise that resolves with distance.
     */
    readUltrasonicDistance (args) {
        return this._peripheral.readUltrasonicDistance(args.TRIG, args.ECHO, args.UNIT);
    }

}

module.exports = OpenBlockArduinoEsp32Device;
