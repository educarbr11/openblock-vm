const formatMessage = require('format-message');

const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const ProgramModeType = require('../../extension-support/program-mode-type');

const ArduinoPeripheral = require('../common/arduino-peripheral');
const {ARDUINO_THEME, applyDeviceTheme} = require('../common/device-visual-theme');

/**
 * The list of USB device filters.
 * @readonly
 */
const PNPID_LIST = [
    // https://github.com/arduino/Arduino/blob/1.8.0/hardware/arduino/avr/boards.txt#L51-L58
    'USB\\VID_2341&PID_0043',
    'USB\\VID_2341&PID_0001',
    'USB\\VID_2A03&PID_0043',
    'USB\\VID_2341&PID_0243',
    // For chinese clones that use CH340
    'USB\\VID_1A86&PID_7523'
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
    fqbn: 'arduino:avr:uno',
    firmware: 'arduinoUno.hex'
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
    A5: 'A5'
};


const Level = {
    High: 'HIGH',
    Low: 'LOW'
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
    InputPullup: 'INPUT_PULLUP'
};

const InterrupMode = {
    Rising: 'RISING',
    Falling: 'FALLING',
    Change: 'CHANGE',
    Low: 'LOW'
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
 * Manage communication with a Arduino Uno peripheral over a OpenBlock Link client socket.
 */
class ArduinoUno extends ArduinoPeripheral{
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
 * OpenBlock blocks to interact with a Arduino Uno peripheral.
 */
class OpenBlockArduinoUnoDevice {
    /**
     * @return {string} - the ID of this extension.
     */
    get DEVICE_ID () {
        return 'arduinoUno';
    }

    get PINS_MENU () {
        return [
            {
                text: '0 (RX)',
                value: Pins.D0
            },
            {
                text: '1 (TX)',
                value: Pins.D1
            },
            {
                text: '2',
                value: Pins.D2
            },
            {
                text: '3',
                value: Pins.D3
            },
            {
                text: '4',
                value: Pins.D4
            },
            {
                text: '5',
                value: Pins.D5
            },
            {
                text: '6',
                value: Pins.D6
            },
            {
                text: '7',
                value: Pins.D7
            },
            {
                text: '8',
                value: Pins.D8
            },
            {
                text: '9',
                value: Pins.D9
            },
            {
                text: '10',
                value: Pins.D10
            },
            {
                text: '11',
                value: Pins.D11
            },
            {
                text: '12',
                value: Pins.D12
            },
            {
                text: '13',
                value: Pins.D13
            },
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
            }
        ];
    }

    get MODE_MENU () {
        return [
            {
                text: formatMessage({
                    id: 'arduinoUno.modeMenu.input',
                    default: 'input',
                    description: 'label for input pin mode'
                }),
                value: Mode.Input
            },
            {
                text: formatMessage({
                    id: 'arduinoUno.modeMenu.output',
                    default: 'output',
                    description: 'label for output pin mode'
                }),
                value: Mode.Output
            },
            {
                text: formatMessage({
                    id: 'arduinoUno.modeMenu.inputPullup',
                    default: 'input-pullup',
                    description: 'label for input-pullup pin mode'
                }),
                value: Mode.InputPullup
            }
        ];
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
            }
        ];
    }

    get LEVEL_MENU () {
        return [
            {
                text: formatMessage({
                    id: 'arduinoUno.levelMenu.high',
                    default: 'high',
                    description: 'label for high level'
                }),
                value: Level.High
            },
            {
                text: formatMessage({
                    id: 'arduinoUno.levelMenu.low',
                    default: 'low',
                    description: 'label for low level'
                }),
                value: Level.Low
            }
        ];
    }

    get PWM_PINS_MENU () {
        return [
            {
                text: '3',
                value: Pins.D3
            },
            {
                text: '5',
                value: Pins.D5
            },
            {
                text: '6',
                value: Pins.D6
            },
            {
                text: '9',
                value: Pins.D9
            },
            {
                text: '10',
                value: Pins.D10
            },
            {
                text: '11',
                value: Pins.D11
            }
        ];
    }

    get INTERRUPT_PINS_MENU () {
        return [
            {
                text: '2',
                value: Pins.D2
            },
            {
                text: '3',
                value: Pins.D3
            }
        ];
    }

    get INTERRUP_MODE_MENU () {
        return [
            {
                text: formatMessage({
                    id: 'arduinoUno.InterrupModeMenu.risingEdge',
                    default: 'rising edge',
                    description: 'label for rising edge interrup'
                }),
                value: InterrupMode.Rising
            },
            {
                text: formatMessage({
                    id: 'arduinoUno.InterrupModeMenu.fallingEdge',
                    default: 'falling edge',
                    description: 'label for falling edge interrup'
                }),
                value: InterrupMode.Falling
            },
            {
                text: formatMessage({
                    id: 'arduinoUno.InterrupModeMenu.changeEdge',
                    default: 'change edge',
                    description: 'label for change edge interrup'
                }),
                value: InterrupMode.Change
            },
            {
                text: formatMessage({
                    id: 'arduinoUno.InterrupModeMenu.low',
                    default: 'low',
                    description: 'label for low interrup'
                }),
                value: InterrupMode.Low
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
                    id: 'arduinoUno.eolMenu.warp',
                    default: 'warp',
                    description: 'label for warp print'
                }),
                value: Eol.Warp
            },
            {
                text: formatMessage({
                    id: 'arduinoUno.eolMenu.noWarp',
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
                    id: 'arduinoUno.distanceUnitMenu.cm',
                    default: 'cm',
                    description: 'label for centimeters unit'
                }),
                value: DistanceUnit.Cm
            },
            {
                text: formatMessage({
                    id: 'arduinoUno.distanceUnitMenu.inch',
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
                    id: 'arduinoUno.dataTypeMenu.integer',
                    default: 'integer',
                    description: 'label for integer'
                }),
                value: DataType.Integer
            },
            {
                text: formatMessage({
                    id: 'arduinoUno.dataTypeMenu.decimal',
                    default: 'decimal',
                    description: 'label for decimal number'
                }),
                value: DataType.Decimal
            },
            {
                text: formatMessage({
                    id: 'arduinoUno.dataTypeMenu.string',
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

        // Create a new Arduino uno peripheral instance
        this._peripheral = new ArduinoUno(this.runtime, this.DEVICE_ID, originalDeviceId);

        this._peripheral.numDigitalPins = 14;
    }

    /**
     * @returns {Array.<object>} metadata for this extension and its blocks.
     */
    getInfo () {
        return applyDeviceTheme([
            {
                id: 'pin',
                name: formatMessage({
                    id: 'arduinoUno.category.pins',
                    default: 'Pins',
                    description: 'The name of the arduino uno device pin category'
                }),
                color1: '#4C97FF',
                color2: '#3373CC',
                color3: '#3373CC',

                blocks: [
                    {
                        opcode: 'setDigitalOutput',
                        text: formatMessage({
                            id: 'arduinoUno.pins.setDigitalOutput',
                            default: 'set digital pin [PIN] out [LEVEL]',
                            description: 'arduinoUno set digital pin out'
                        }),
                        blockType: BlockType.COMMAND,
                        arguments: {
                            PIN: {
                                type: ArgumentType.STRING,
                                menu: 'pins',
                                defaultValue: Pins.D0
                            },
                            LEVEL: {
                                type: ArgumentType.STRING,
                                menu: 'level',
                                defaultValue: Level.High
                            }
                        }
                    },
                    {

                        opcode: 'setPwmOutput',
                        text: formatMessage({
                            id: 'arduinoUno.pins.setPwmOutput',
                            default: 'set pwm pin [PIN] out [OUT]',
                            description: 'arduinoUno set pwm pin out'
                        }),
                        blockType: BlockType.COMMAND,
                        arguments: {
                            PIN: {
                                type: ArgumentType.STRING,
                                menu: 'pwmPins',
                                defaultValue: Pins.D3
                            },
                            OUT: {
                                type: ArgumentType.UINT8_NUMBER,
                                defaultValue: '255'
                            }
                        }
                    },
                    '---',
                    {
                        opcode: 'readDigitalPin',
                        text: formatMessage({
                            id: 'arduinoUno.pins.readDigitalPin',
                            default: 'read digital pin [PIN]',
                            description: 'arduinoUno read digital pin'
                        }),
                        blockType: BlockType.BOOLEAN,
                        arguments: {
                            PIN: {
                                type: ArgumentType.STRING,
                                menu: 'pins',
                                defaultValue: Pins.D0
                            }
                        }
                    },
                    {
                        opcode: 'readAnalogPin',
                        text: formatMessage({
                            id: 'arduinoUno.pins.readAnalogPin',
                            default: 'read analog pin [PIN]',
                            description: 'arduinoUno read analog pin'
                        }),
                        blockType: BlockType.REPORTER,
                        arguments: {
                            PIN: {
                                type: ArgumentType.STRING,
                                menu: 'analogPins',
                                defaultValue: Pins.A0
                            }
                        }
                    },
                    '---',
                    {

                        opcode: 'setServoOutput',
                        text: formatMessage({
                            id: 'arduinoUno.pins.setServoOutput',
                            default: 'set servo pin [PIN] out [OUT]',
                            description: 'arduinoUno set servo pin out'
                        }),
                        blockType: BlockType.COMMAND,
                        arguments: {
                            PIN: {
                                type: ArgumentType.STRING,
                                menu: 'pwmPins',
                                defaultValue: Pins.D3
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
                            id: 'arduinoUno.pins.playToneForSeconds',
                            default: 'play sound on pin [PIN] note [NOTE] for [SECONDS] seconds',
                            description: 'arduinoUno play tone for seconds'
                        }),
                        blockType: BlockType.COMMAND,
                        arguments: {
                            PIN: {
                                type: ArgumentType.STRING,
                                menu: 'pins',
                                defaultValue: Pins.D9
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
                            id: 'arduinoUno.pins.playToneForBeat',
                            default: 'play sound on pin [PIN] note [NOTE] for [BEAT] beat',
                            description: 'arduinoUno play tone for beat'
                        }),
                        blockType: BlockType.COMMAND,
                        arguments: {
                            PIN: {
                                type: ArgumentType.STRING,
                                menu: 'pins',
                                defaultValue: Pins.D9
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
                            id: 'arduinoUno.pins.stopTone',
                            default: 'stop sound on pin [PIN]',
                            description: 'arduinoUno stop tone'
                        }),
                        blockType: BlockType.COMMAND,
                        arguments: {
                            PIN: {
                                type: ArgumentType.STRING,
                                menu: 'pins',
                                defaultValue: Pins.D9
                            }
                        }
                    },
                    {
                        opcode: 'readUltrasonicDistance',
                        text: formatMessage({
                            id: 'arduinoUno.pins.readUltrasonicDistance',
                            default: 'read ultrasonic distance TRIG [TRIG] ECHO [ECHO] in [UNIT]',
                            description: 'arduinoUno read ultrasonic distance'
                        }),
                        blockType: BlockType.REPORTER,
                        arguments: {
                            TRIG: {
                                type: ArgumentType.STRING,
                                menu: 'pins',
                                defaultValue: Pins.D9
                            },
                            ECHO: {
                                type: ArgumentType.STRING,
                                menu: 'pins',
                                defaultValue: Pins.D10
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
                        opcode: 'attachInterrupt',
                        text: formatMessage({
                            id: 'arduinoUno.pins.attachInterrupt',
                            default: 'attach interrupt pin [PIN] mode [MODE] executes',
                            description: 'arduinoUno attach interrupt'
                        }),
                        blockType: BlockType.CONDITIONAL,
                        arguments: {
                            PIN: {
                                type: ArgumentType.STRING,
                                menu: 'interruptPins',
                                defaultValue: Pins.D3
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

                        opcode: 'detachInterrupt',
                        text: formatMessage({
                            id: 'arduinoUno.pins.detachInterrupt',
                            default: 'detach interrupt pin [PIN]',
                            description: 'arduinoUno detach interrupt'
                        }),
                        blockType: BlockType.COMMAND,
                        arguments: {
                            PIN: {
                                type: ArgumentType.STRING,
                                menu: 'interruptPins',
                                defaultValue: Pins.D3
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
                    pwmPins: {
                        acceptReporters: true,
                        items: this.PWM_PINS_MENU
                    },
                    interruptPins: {
                        acceptReporters: true,
                        items: this.INTERRUPT_PINS_MENU
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
                    id: 'arduinoUno.category.serial',
                    default: 'Serial',
                    description: 'The name of the arduino uno device serial category'
                }),
                color1: '#9966FF',
                color2: '#774DCB',
                color3: '#774DCB',

                blocks: [
                    {
                        opcode: 'serialBegin',
                        text: formatMessage({
                            id: 'arduinoUno.serial.serialBegin',
                            default: 'serial begin baudrate [VALUE]',
                            description: 'arduinoUno serial begin'
                        }),
                        blockType: BlockType.COMMAND,
                        arguments: {
                            VALUE: {
                                type: ArgumentType.STRING,
                                menu: 'baudrate',
                                defaultValue: Buadrate.B9600
                            }
                        },
                        programMode: [ProgramModeType.UPLOAD]
                    },
                    {
                        opcode: 'serialPrint',
                        text: formatMessage({
                            id: 'arduinoUno.serial.serialPrint',
                            default: 'serial print [VALUE] [EOL]',
                            description: 'arduinoUno serial print'
                        }),
                        blockType: BlockType.COMMAND,
                        arguments: {
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
                        opcode: 'serialAvailable',
                        text: formatMessage({
                            id: 'arduinoUno.serial.serialAvailable',
                            default: 'serial available data length',
                            description: 'arduinoUno serial available data length'
                        }),
                        blockType: BlockType.REPORTER,
                        disableMonitor: true,
                        programMode: [ProgramModeType.UPLOAD]
                    },
                    {
                        opcode: 'serialReadAByte',
                        text: formatMessage({
                            id: 'arduinoUno.serial.serialReadAByte',
                            default: 'serial read a byte',
                            description: 'arduinoUno serial read a byte'
                        }),
                        blockType: BlockType.REPORTER,
                        disableMonitor: true,
                        programMode: [ProgramModeType.UPLOAD]
                    }
                ],
                menus: {
                    baudrate: {
                        items: this.BAUDTATE_MENU
                    },
                    eol: {
                        items: this.EOL_MENU
                    }
                }
            },
            {
                id: 'data',
                name: formatMessage({
                    id: 'arduinoUno.category.data',
                    default: 'Data',
                    description: 'The name of the arduino uno device data category'
                }),
                color1: '#CF63CF',
                color2: '#C94FC9',
                color3: '#BD42BD',
                blocks: [
                    {
                        opcode: 'dataMap',
                        text: formatMessage({
                            id: 'arduinoUno.data.dataMap',
                            default: 'map [DATA] from ([ARG0], [ARG1]) to ([ARG2], [ARG3])',
                            description: 'arduinoUno data map'
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
                            id: 'arduinoUno.data.dataConstrain',
                            default: 'constrain [DATA] between ([ARG0], [ARG1])',
                            description: 'arduinoUno data constrain'
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
                            id: 'arduinoUno.data.dataConvert',
                            default: 'convert [DATA] to [TYPE]',
                            description: 'arduinoUno data convert'
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
                            id: 'arduinoUno.data.dataConvertASCIICharacter',
                            default: 'convert [DATA] to ASCII character',
                            description: 'arduinoUno data convert to ASCII character'
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
                            id: 'arduinoUno.data.dataConvertASCIINumber',
                            default: 'convert [DATA] to ASCII nubmer',
                            description: 'arduinoUno data convert to ASCII nubmer'
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
        ], ARDUINO_THEME);
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

module.exports = OpenBlockArduinoUnoDevice;
