const formatMessage = require('format-message');

const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const ProgramModeType = require('../../extension-support/program-mode-type');

const MicrobitRealtimePeripheral = require('../common/microbit-realtime-peripheral');
const {MICROBIT_THEME, applyDeviceTheme} = require('../common/device-visual-theme');

/**
* The list of USB device filters.
* @readonly
*/
const PNPID_LIST = [
    'USB\\VID_0D28&PID_0204'
];

/**
* Configuration of serialport
* @readonly
*/
const SERIAL_CONFIG = {
    baudRate: 115200,
    dataBits: 8,
    stopBits: 1
};

/**
 * Configuration of flash.
 * @readonly
 */
const DIVECE_OPT = {
    type: 'microbit'
};

const LedState = {
    On: 'on',
    Off: 'off'
};

const Key = {
    A: 'a',
    B: 'b'
};

const Gestrue = {
    Shake: 'shake',
    Up: 'up',
    Down: 'down',
    Left: 'left',
    Right: 'right',
    Faceup: 'faceup',
    Facedown: 'facedown',
    Freefall: 'freefall',
    G3: '3g',
    G6: '6g',
    G8: '8g'
};

const Axis = {
    X: 'x',
    Y: 'y',
    Z: 'z'
};

const Pins = {
    P0: '0',
    P1: '1',
    P2: '2',
    P3: '3',
    P4: '4',
    P5: '5',
    P6: '6',
    P7: '7',
    P8: '8',
    P9: '9',
    P10: '10',
    P11: '11',
    P12: '12',
    P13: '13',
    P14: '14',
    P15: '15',
    P16: '16'
};

const Level = {
    High: '1',
    Low: '0'
};

const SoundEvent = {
    Loud: 'loud',
    Quiet: 'quiet'
};

const LogoEvent = {
    Pressed: 'pressed',
    Released: 'released'
};

/**
 * Manage communication with a Microbit peripheral over a OpenBlock Link client socket.
 */
class Microbit extends MicrobitRealtimePeripheral{
    /**
     * Construct a Microbit communication object.
     * @param {Runtime} runtime - the OpenBlock runtime
     * @param {string} deviceId - the id of the deivce
     * @param {string} originalDeviceId - the original id of the peripheral, like xxx_arduinoUno
     */
    constructor (runtime, deviceId, originalDeviceId) {
        super(runtime, deviceId, originalDeviceId, PNPID_LIST, SERIAL_CONFIG, DIVECE_OPT);
    }
}

/**
 * OpenBlock blocks to interact with a Microbit peripheral.
 */
class OpenBlockMicrobitDevice {
    /**
     * @return {string} - the ID of this deivce.
     */
    get DEVICE_ID () {
        return 'microbit';
    }

    get LEDSTATE_MENU () {
        return [
            {
                text: formatMessage({
                    id: 'microbit.ledState.on',
                    default: 'ligado',
                    description: 'label for led state on'
                }),
                value: LedState.On
            },
            {
                text: formatMessage({
                    id: 'microbit.ledState.off',
                    default: 'desligado',
                    description: 'label for led state off'
                }),
                value: LedState.Off
            }
        ];
    }

    get LEDBRT_MENU () {
        return [
            {
                text: '0',
                value: '0'
            },
            {
                text: '1',
                value: '1'
            },
            {
                text: '2',
                value: '2'
            },
            {
                text: '3',
                value: '3'
            },
            {
                text: '4',
                value: '4'
            },
            {
                text: '5',
                value: '5'
            },
            {
                text: '6',
                value: '6'
            },
            {
                text: '7',
                value: '7'
            },
            {
                text: '8',
                value: '8'
            },
            {
                text: '9',
                value: '9'
            }
        ];
    }

    get KEYS_MENU () {
        return [
            {
                text: 'A',
                value: Key.A
            },
            {
                text: 'B',
                value: Key.B
            }
        ];
    }

    get SOUND_EVENTS_MENU () {
        return [
            {
                text: formatMessage({
                    id: 'microbit.soundEvent.loud',
                    default: 'forte',
                    description: 'label for loud sound event'
                }),
                value: SoundEvent.Loud
            },
            {
                text: formatMessage({
                    id: 'microbit.soundEvent.quiet',
                    default: 'baixo',
                    description: 'label for quiet sound event'
                }),
                value: SoundEvent.Quiet
            }
        ];
    }

    get LOGO_EVENTS_MENU () {
        return [
            {
                text: formatMessage({
                    id: 'microbit.logoEvent.pressed',
                    default: 'pressionado',
                    description: 'label for logo pressed event'
                }),
                value: LogoEvent.Pressed
            },
            {
                text: formatMessage({
                    id: 'microbit.logoEvent.released',
                    default: 'liberado',
                    description: 'label for logo released event'
                }),
                value: LogoEvent.Released
            }
        ];
    }

    get GESTRUES_MENU () {
        return [
            {
                text: formatMessage({
                    id: 'microbit.gestruesMenu.shaken',
                    default: 'sacudido',
                    description: 'label for shaken gestrue'
                }),
                value: Gestrue.Shake
            },
            {
                text: formatMessage({
                    id: 'microbit.gestruesMenu.tiltedUpward',
                    default: 'inclinado para cima',
                    description: 'label for tilted upward gestrue'
                }),
                value: Gestrue.Up
            },
            {
                text: formatMessage({
                    id: 'microbit.gestruesMenu.tiltedDownward',
                    default: 'inclinado para baixo',
                    description: 'label for tilted downward gestrue'
                }),
                value: Gestrue.Down
            },
            {
                text: formatMessage({
                    id: 'microbit.gestruesMenu.tiltedLeftward',
                    default: 'inclinado para a esquerda',
                    description: 'label for tilted leftward gestrue'
                }),
                value: Gestrue.Left
            },
            {
                text: formatMessage({
                    id: 'microbit.gestruesMenu.tiltedRightward',
                    default: 'inclinado para a direita',
                    description: 'label for tilted rightward gestrue'
                }),
                value: Gestrue.Right
            },
            {
                text: formatMessage({
                    id: 'microbit.gestruesMenu.faceUp',
                    default: 'virado para cima',
                    description: 'label for face up gestrue'
                }),
                value: Gestrue.Faceup
            },
            {
                text: formatMessage({
                    id: 'microbit.gestruesMenu.faceDown',
                    default: 'virado para baixo',
                    description: 'label for face down gestrue'
                }),
                value: Gestrue.Facedown
            },
            {
                text: formatMessage({
                    id: 'microbit.gestruesMenu.freefall',
                    default: 'queda livre',
                    description: 'label for freefall gestrue'
                }),
                value: Gestrue.Freefall
            },
            {
                text: '3g',
                value: Gestrue.G3
            },
            {
                text: '6g',
                value: Gestrue.G6
            },
            {
                text: '8g',
                value: Gestrue.G8
            }
        ];
    }

    get AXIS_MENU () {
        return [
            {
                text: formatMessage({
                    id: 'microbit.axisMenu.xAxis',
                    default: 'eixo X',
                    description: 'label for x axis'
                }),
                value: Axis.X
            },
            {
                text: formatMessage({
                    id: 'microbit.axisMenu.yAxis',
                    default: 'eixo Y',
                    description: 'label for y axis'
                }),
                value: Axis.Y
            },
            {
                text: formatMessage({
                    id: 'microbit.axisMenu.zAxis',
                    default: 'eixo Z',
                    description: 'label for z axis'
                }),
                value: Axis.Z
            }
        ];
    }

    get PINS_MENU () {
        return [
            {
                text: 'P0',
                value: Pins.P0
            },
            {
                text: 'P1',
                value: Pins.P1
            },
            {
                text: 'P2',
                value: Pins.P2
            },
            {
                text: 'P3',
                value: Pins.P3
            },
            {
                text: 'P4',
                value: Pins.P4
            },
            {
                text: 'P5',
                value: Pins.P5
            },
            {
                text: 'P6',
                value: Pins.P6
            },
            {
                text: 'P7',
                value: Pins.P7
            },
            {
                text: 'P8',
                value: Pins.P8
            },
            {
                text: 'P9',
                value: Pins.P9
            },
            {
                text: 'P10',
                value: Pins.P10
            },
            {
                text: 'P11',
                value: Pins.P11
            },
            {
                text: 'P12',
                value: Pins.P12
            },
            {
                text: 'P13',
                value: Pins.P13
            },
            {
                text: 'P14',
                value: Pins.P14
            },
            {
                text: 'P15',
                value: Pins.P15
            },
            {
                text: 'P16',
                value: Pins.P16
            }

        ];
    }

    get LEVEL_MENU () {
        return [
            {
                text: formatMessage({
                    id: 'microbit.levelMenu.high',
                    default: 'ligado',
                    description: 'label for high level'
                }),
                value: Level.High
            },
            {
                text: formatMessage({
                    id: 'microbit.levelMenu.low',
                    default: 'desligado',
                    description: 'label for low level'
                }),
                value: Level.Low
            }
        ];
    }

    get ANALOG_PINS_MENU () {
        return [
            {
                text: 'P0',
                value: Pins.P0
            },
            {
                text: 'P1',
                value: Pins.P1
            },
            {
                text: 'P2',
                value: Pins.P2
            },
            {
                text: 'P3',
                value: Pins.P3
            },
            {
                text: 'P4',
                value: Pins.P4
            },
            {
                text: 'P10',
                value: Pins.P10
            }
        ];
    }

    get TOUCH_PINS_MENU () {
        return [
            {
                text: 'P0',
                value: Pins.P0
            },
            {
                text: 'P1',
                value: Pins.P1
            },
            {
                text: 'P2',
                value: Pins.P2
            }
        ];
    }

    get CHANNEL_MENU () {
        const channel = [];

        for (let i = 0; i < 84; i++) {
            channel.push(
                {
                    text: `${i}`,
                    value: `${i}`
                });
        }
        return channel;
    }

    /**
     * Construct a set of Microbit blocks.
     * @param {Runtime} runtime - the OpenBlock runtime.
     * @param {string} originalDeviceId - the original id of the peripheral, like xxx_arduinoUno
     */
    constructor (runtime, originalDeviceId) {
        /**
         * The OpenBlock runtime.
         * @type {Runtime}
         */
        this.runtime = runtime;

        // Create a new Microbit peripheral instance
        this._peripheral = new Microbit(this.runtime, this.DEVICE_ID, originalDeviceId);
    }

    /**
     * @returns {Array.<object>} metadata for this extension and its blocks.
     */
    getInfo () {
        const categories = [{
            id: 'pin',
            name: formatMessage({
                id: 'microbit.category.pins',
                default: 'Pins',
                description: 'The name of the microbit device pin category'
            }),
            color1: '#4C97FF',
            color2: '#3373CC',
            color3: '#3373CC',

            blocks: [
                {
                    opcode: 'setDigitalOutput',
                    text: formatMessage({
                        id: 'microbit.pins.setDigitalOutput',
                        default: 'set digital pin [PIN] out [LEVEL]',
                        description: 'microbit set digital pin out'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        PIN: {
                            type: ArgumentType.STRING,
                            menu: 'pins',
                            defaultValue: Pins.P0
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
                        id: 'microbit.pins.setPwmOutput',
                        default: 'set pwm pin [PIN] out [OUT]',
                        description: 'microbit set pwm pin out'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        PIN: {
                            type: ArgumentType.STRING,
                            menu: 'pins',
                            defaultValue: Pins.P0
                        },
                        OUT: {
                            type: ArgumentType.UINT10_NUMBER,
                            defaultValue: '1023'
                        }
                    }
                },
                '---',
                {
                    opcode: 'readDigitalPin',
                    text: formatMessage({
                        id: 'microbit.pins.readDigitalPin',
                        default: 'read digital pin [PIN]',
                        description: 'microbit read digital pin'
                    }),
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        PIN: {
                            type: ArgumentType.STRING,
                            menu: 'pins',
                            defaultValue: Pins.P0
                        }
                    }
                },
                {
                    opcode: 'readAnalogPin',
                    text: formatMessage({
                        id: 'microbit.pins.readAnalogPin',
                        default: 'read analog pin [PIN]',
                        description: 'microbit read analog pin'
                    }),
                    blockType: BlockType.REPORTER,
                    arguments: {
                        PIN: {
                            type: ArgumentType.STRING,
                            menu: 'analogPins',
                            defaultValue: Pins.P0
                        }
                    }
                },
                '---',
                {
                    opcode: 'pinTouched',
                    text: formatMessage({
                        id: 'microbit.pins.pinIsTouched',
                        default: 'pin [PIN] is touched',
                        description: 'microbit pin is touched'
                    }),
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        PIN: {
                            type: ArgumentType.STRING,
                            menu: 'touchPins',
                            defaultValue: Pins.P0
                        }
                    }
                }
            ],
            menus: {
                pins: {
                    items: this.PINS_MENU
                },
                level: {
                    acceptReporters: true,
                    items: this.LEVEL_MENU
                },
                analogPins: {
                    items: this.ANALOG_PINS_MENU
                },
                touchPins: {
                    items: this.TOUCH_PINS_MENU
                }
            }
        },
        {
            id: 'display',
            name: formatMessage({
                id: 'microbit.category.display',
                default: 'Display',
                description: 'The name of the microbit device display category'
            }),
            color1: '#9966FF',
            color2: '#774DCB',
            color3: '#774DCB',
            blocks: [
                {
                    opcode: 'showImage',
                    text: formatMessage({
                        id: 'microbit.display.showImage',
                        default: 'show image [VALUE]',
                        description: 'microbit show image'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        VALUE: {
                            type: ArgumentType.MATRIX,
                            defaultValue: '0101010101100010101000100'
                        }
                    }
                },
                {
                    opcode: 'showImageUntil',
                    text: formatMessage({
                        id: 'microbit.display.showImageUntil',
                        default: 'show image [VALUE] for [TIME] secs',
                        description: 'microbit show image for some times'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        VALUE: {
                            type: ArgumentType.MATRIX,
                            defaultValue: '0101010101100010101000100'
                        },
                        TIME: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '1'
                        }
                    }
                },
                {
                    opcode: 'show',
                    text: formatMessage({
                        id: 'microbit.display.show',
                        default: 'show [TEXT]',
                        description: 'microbit show'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Hello OpenBlock'
                        }
                    }
                },
                {
                    opcode: 'showUntilScrollDone',
                    text: formatMessage({
                        id: 'microbit.display.showUntilScrollDone',
                        default: 'show [TEXT] until scroll done',
                        description: 'microbit show until scroll done'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Hello OpenBlock'
                        }
                    }
                },
                '---',
                {
                    opcode: 'clearDisplay',
                    text: formatMessage({
                        id: 'microbit.display.clearDisplay',
                        default: 'clear screen',
                        description: 'microbit clear display'
                    }),
                    blockType: BlockType.COMMAND
                },
                '---',
                {
                    opcode: 'lightPixelAt',
                    text: formatMessage({
                        id: 'microbit.display.lightPixelAt',
                        default: 'light [STATE] at the x: [X] axis, y: [Y] axis',
                        description: 'microbit light pixel at'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        STATE: {
                            type: ArgumentType.STRING,
                            menu: 'ledState',
                            defaultValue: LedState.On
                        },
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        }
                    }
                },
                {
                    opcode: 'showOnPiexlbrightness',
                    text: formatMessage({
                        id: 'microbit.display.showOnPiexlbrightness',
                        default: 'show on the x: [X] axis, y: [Y] axis with brightness [BRT]',
                        description: 'microbit show on piexl brightness'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        BRT: {
                            type: ArgumentType.STRING,
                            menu: 'ledBrightness',
                            defaultValue: '9'
                        }
                    }
                }
            ],
            menus: {
                ledState: {
                    items: this.LEDSTATE_MENU
                },
                ledBrightness: {
                    acceptReporters: true,
                    items: this.LEDBRT_MENU
                }
            }
        },
        {
            id: 'sensor',
            name: formatMessage({
                id: 'microbit.category.sensor',
                default: 'Sensor',
                description: 'The name of the microbit device sensor category'
            }),
            color1: '#4CBFE6',
            color2: '#2E8EB8',
            color3: '#2E8EB8',

            blocks: [
                {
                    opcode: 'buttonIsPressed',
                    text: formatMessage({
                        id: 'microbit.sensor.buttonIsPressed',
                        default: '[KEY] button is pressed?',
                        description: 'wether microbit button is pressed'
                    }),
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        KEY: {
                            type: ArgumentType.STRING,
                            menu: 'keys',
                            defaultValue: Key.A
                        }
                    }
                },
                {
                    opcode: 'logoIsPressed',
                    text: formatMessage({
                        id: 'microbit.sensor.logoIsPressed',
                        default: 'logotipo pressionado?',
                        description: 'whether microbit logo is pressed'
                    }),
                    blockType: BlockType.BOOLEAN
                },
                {
                    opcode: 'soundLevel',
                    text: formatMessage({
                        id: 'microbit.sensor.soundLevel',
                        default: 'nível do som',
                        description: 'microbit microphone sound level'
                    }),
                    blockType: BlockType.REPORTER,
                    disableMonitor: true
                },
                {
                    opcode: 'setSoundThreshold',
                    text: formatMessage({
                        id: 'microbit.sensor.setSoundThreshold',
                        default: 'definir som [EVENT] no limite [VALUE]',
                        description: 'set microbit sound event threshold'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        EVENT: {
                            type: ArgumentType.STRING,
                            menu: 'soundEvents',
                            defaultValue: SoundEvent.Loud
                        },
                        VALUE: {
                            type: ArgumentType.UINT8_NUMBER,
                            defaultValue: '128'
                        }
                    }
                },
                '---',
                {
                    opcode: 'gestureIsX',
                    text: formatMessage({
                        id: 'microbit.sensor.gestureIsX',
                        default: 'gestrue is [STA]?',
                        description: 'microbit gestrue is XXX'
                    }),
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        STA: {
                            type: ArgumentType.STRING,
                            menu: 'gestrues',
                            defaultValue: Gestrue.Shake
                        }
                    }
                },
                {
                    opcode: 'axisAcceleration',
                    text: formatMessage({
                        id: 'microbit.sensor.axisAcceleration',
                        default: '[AXIS] axis acceleration',
                        description: 'microbit axis acceleration'
                    }),
                    blockType: BlockType.REPORTER,
                    arguments: {
                        AXIS: {
                            type: ArgumentType.STRING,
                            menu: 'axis',
                            defaultValue: Axis.X
                        }
                    }
                },
                '---',
                {
                    opcode: 'compassAngle',
                    text: formatMessage({
                        id: 'microbit.sensor.compassAngle',
                        default: 'compass angle',
                        description: 'microbit compass angle'
                    }),
                    blockType: BlockType.REPORTER,
                    disableMonitor: true
                },
                {
                    opcode: 'compassMagneticDensity',
                    text: formatMessage({
                        id: 'microbit.sensor.compassMagneticDensity',
                        default: 'compass magnetic density',
                        description: 'microbit compass magnetic density'
                    }),
                    blockType: BlockType.REPORTER,
                    disableMonitor: true
                },
                {
                    opcode: 'calibrateCompass',
                    text: formatMessage({
                        id: 'microbit.sensor.calibrateCompass',
                        default: 'calibrate compass',
                        description: 'microbit calibrate compass'
                    }),
                    blockType: BlockType.COMMAND
                },
                '---',
                {
                    opcode: 'lightLevel',
                    text: formatMessage({
                        id: 'microbit.sensor.lightLevel',
                        default: 'light level',
                        description: 'microbit light level'
                    }),
                    blockType: BlockType.REPORTER,
                    disableMonitor: true
                },
                '---',
                {
                    opcode: 'temperature',
                    text: formatMessage({
                        id: 'microbit.sensor.temperature',
                        default: 'temperature',
                        description: 'microbit temperature'
                    }),
                    blockType: BlockType.REPORTER,
                    disableMonitor: true
                },
                '---',
                {
                    opcode: 'runningTime',
                    text: formatMessage({
                        id: 'microbit.sensor.runningTime',
                        default: 'running time',
                        description: 'microbit running time'
                    }),
                    blockType: BlockType.REPORTER,
                    disableMonitor: true
                }
            ],
            menus: {
                keys: {
                    items: this.KEYS_MENU
                },
                gestrues: {
                    items: this.GESTRUES_MENU
                },
                axis: {
                    items: this.AXIS_MENU
                },
                soundEvents: {
                    items: this.SOUND_EVENTS_MENU
                }
            }
        },
        {
            id: 'wireless',
            name: formatMessage({
                id: 'microbit.category.wireless',
                default: 'Wireless',
                description: 'The name of the microbit device wireless category'
            }),
            color1: '#D65CD6',
            color2: '#BD42BD',
            color3: '#BD42BD',

            blocks: [
                {
                    opcode: 'openWirelessCommunication',
                    text: formatMessage({
                        id: 'microbit.wireless.openWirelessCommunication',
                        default: 'open wireless communication',
                        description: 'microbit open wireless communication'
                    }),
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'closeWirelessCommunication',
                    text: formatMessage({
                        id: 'microbit.wireless.closeWirelessCommunication',
                        default: 'close wireless communication',
                        description: 'microbit close wireless communication'
                    }),
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'resetWirelessCommunication',
                    text: formatMessage({
                        id: 'microbit.wireless.resetWirelessCommunication',
                        default: 'reset wireless communication',
                        description: 'microbit reset wireless communication'
                    }),
                    blockType: BlockType.COMMAND
                },
                '---',
                {
                    opcode: 'sendWirelessMessage',
                    text: formatMessage({
                        id: 'microbit.wireless.sendWirelessMessage',
                        default: 'send wireless message [TEXT]',
                        description: 'microbit send wireless message'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Hello OpenBlock'
                        }
                    }
                },
                {
                    opcode: 'receiveWirelessMessage',
                    text: formatMessage({
                        id: 'microbit.wireless.receiveWirelessMessage',
                        default: 'receive wireless message',
                        description: 'microbit receive wireless message'
                    }),
                    blockType: BlockType.REPORTER,
                    disableMonitor: true
                },
                {
                    opcode: 'setWirelessCommunicationChannel',
                    text: formatMessage({
                        id: 'microbit.wireless.setWirelessCommunicationChannel',
                        default: 'set wireless communication channel as [CH]',
                        description: 'microbit set wireless communication channel'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        CH: {
                            type: ArgumentType.STRING,
                            menu: 'channel',
                            defaultValue: '0'
                        }
                    }
                }
            ],
            menus: {
                channel: {
                    items: this.CHANNEL_MENU
                }
            }
        },
        {
            id: 'console',
            name: formatMessage({
                id: 'microbit.category.console',
                default: 'Console',
                description: 'The name of the microbit device console category'
            }),
            color1: '#FF3399',
            color2: '#CC297A',
            color3: '#CC297A',

            blocks: [
                {
                    opcode: 'consolePrint',
                    text: formatMessage({
                        id: 'microbit.console.consolePrint',
                        default: 'print [TEXT]',
                        description: 'microbit console print'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Hello OpenBlock'
                        }
                    }
                }
            ],
            menus: { }
        }
        ];

        const supportedOpcodes = [
            'setDigitalOutput',
            'setPwmOutput',
            'readDigitalPin',
            'readAnalogPin',
            'pinTouched',
            'showImage',
            'clearDisplay',
            'buttonIsPressed',
            'logoIsPressed',
            'soundLevel',
            'setSoundThreshold',
            'gestureIsX',
            'axisAcceleration',
            'lightLevel',
            'temperature',
            'runningTime'
        ];
        const supportedOpcodeSet = new Set(supportedOpcodes);
        const blocks = [
            {
                opcode: 'whenMicrobitBegin',
                text: formatMessage({
                    id: 'microbit.event.whenMicrobitBegin',
                    default: 'when micro:bit starts',
                    description: 'microbit realtime starts'
                }),
                blockType: BlockType.EVENT,
                isEdgeActivated: false,
                shouldRestartExistingThreads: false,
                programMode: [ProgramModeType.UPLOAD]
            },
            {
                opcode: 'whenButtonPressed',
                text: formatMessage({
                    id: 'microbit.event.whenButtonPressed',
                    default: 'when button [KEY] pressed',
                    description: 'microbit button pressed event'
                }),
                blockType: BlockType.EVENT,
                isEdgeActivated: false,
                shouldRestartExistingThreads: false,
                arguments: {
                    KEY: {
                        type: ArgumentType.STRING,
                        menu: 'keys',
                        defaultValue: Key.A
                    }
                }
            },
            {
                opcode: 'whenSound',
                text: formatMessage({
                    id: 'microbit.event.whenSound',
                    default: 'quando o som estiver [EVENT]',
                    description: 'microbit sound event'
                }),
                blockType: BlockType.EVENT,
                isEdgeActivated: false,
                shouldRestartExistingThreads: false,
                arguments: {
                    EVENT: {
                        type: ArgumentType.STRING,
                        menu: 'soundEvents',
                        defaultValue: SoundEvent.Loud
                    }
                }
            },
            {
                opcode: 'whenLogo',
                text: formatMessage({
                    id: 'microbit.event.whenLogo',
                    default: 'quando o logotipo for [EVENT]',
                    description: 'microbit logo event'
                }),
                blockType: BlockType.EVENT,
                isEdgeActivated: false,
                shouldRestartExistingThreads: false,
                arguments: {
                    EVENT: {
                        type: ArgumentType.STRING,
                        menu: 'logoEvents',
                        defaultValue: LogoEvent.Pressed
                    }
                }
            },
            {
                opcode: 'whenPinTouched',
                text: formatMessage({
                    id: 'microbit.event.whenPinTouched',
                    default: 'when pin [PIN] touched',
                    description: 'microbit pin touched event'
                }),
                blockType: BlockType.EVENT,
                isEdgeActivated: false,
                shouldRestartExistingThreads: false,
                arguments: {
                    PIN: {
                        type: ArgumentType.STRING,
                        menu: 'touchPins',
                        defaultValue: Pins.P0
                    }
                }
            },
            {
                opcode: 'whenGesture',
                text: formatMessage({
                    id: 'microbit.event.whenGesture',
                    default: 'when gesture [STA]',
                    description: 'microbit gesture event'
                }),
                blockType: BlockType.EVENT,
                isEdgeActivated: false,
                shouldRestartExistingThreads: false,
                arguments: {
                    STA: {
                        type: ArgumentType.STRING,
                        menu: 'gestrues',
                        defaultValue: Gestrue.Shake
                    }
                }
            },
            '---'
        ];

        let previousWasSeparator = true;
        const addBlock = block => {
            if (block === '---') {
                if (!previousWasSeparator && blocks.length > 0) {
                    blocks.push(block);
                    previousWasSeparator = true;
                }
                return;
            }
            blocks.push(block);
            previousWasSeparator = false;
        };

        categories.forEach(category => {
            category.blocks.forEach(block => {
                if (block === '---') {
                    addBlock(block);
                    return;
                }
                if (supportedOpcodeSet.has(block.opcode)) {
                    addBlock(block);
                }
            });
            addBlock('---');
        });

        if (blocks[blocks.length - 1] === '---') {
            blocks.pop();
        }

        const menus = {};
        categories.forEach(category => Object.assign(menus, category.menus));
        menus.soundEvents = {items: this.SOUND_EVENTS_MENU};
        menus.logoEvents = {items: this.LOGO_EVENTS_MENU};

        return applyDeviceTheme([{
            id: 'microbit',
            name: formatMessage({
                id: 'microbit.category.microbit',
                default: 'micro:bit v2',
                description: 'The name of the microbit device category'
            }),
            color1: '#4CBFE6',
            color2: '#2E8EB8',
            color3: '#2E8EB8',
            blocks: blocks,
            menus: menus
        }], MICROBIT_THEME);
    }

    /**
     * Set pin digital out level.
     * @param {object} args - the block's arguments.
     * @return {Promise} - a Promise that resolves after the set pin digital out level is done.
     */
    setDigitalOutput (args) {
        return this._peripheral.setDigitalOutput(args.PIN, args.LEVEL);
    }

    /**
     * Set pin pwm out value.
     * @param {object} args - the block's arguments.
     * @return {Promise} - a Promise that resolves after the set pin pwm out value is done.
     */
    setPwmOutput (args) {
        return this._peripheral.setPwmOutput(args.PIN, args.OUT);
    }

    logoIsPressed () {
        return this._peripheral.logoIsPressed();
    }

    soundLevel () {
        return this._peripheral.soundLevel();
    }

    setSoundThreshold (args) {
        return this._peripheral.setSoundThreshold(args.EVENT, args.VALUE);
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
     * @return {number} - analog value of the pin.
     */
    readAnalogPin (args) {
        return this._peripheral.readAnalogPin(args.PIN);
    }

    /**
     * Read pin touch state.
     * @param {object} args - the block's arguments.
     * @return {boolean} - true if pin is touched.
     */
    pinTouched (args) {
        return this._peripheral.pinTouched(args.PIN);
    }

    /**
     * Read button state.
     * @param {object} args - the block's arguments.
     * @return {boolean} - true if button is pressed.
     */
    buttonIsPressed (args) {
        return this._peripheral.buttonIsPressed(args.KEY);
    }

    /**
     * Read gesture state.
     * @param {object} args - the block's arguments.
     * @return {boolean} - true if gesture matches.
     */
    gestureIsX (args) {
        return this._peripheral.gestureIsX(args.STA);
    }

    /**
     * Read axis acceleration.
     * @param {object} args - the block's arguments.
     * @return {number} - acceleration value.
     */
    axisAcceleration (args) {
        return this._peripheral.axisAcceleration(args.AXIS);
    }

    /**
     * Read light level.
     * @return {number} - light level.
     */
    lightLevel () {
        return this._peripheral.lightLevel();
    }

    /**
     * Read temperature.
     * @return {number} - celsius temperature.
     */
    temperature () {
        return this._peripheral.temperature();
    }

    /**
     * Read running time.
     * @return {number} - running time in milliseconds.
     */
    runningTime () {
        return this._peripheral.runningTime();
    }

    /**
     * Show image on the micro:bit display.
     * @param {object} args - the block's arguments.
     * @return {Promise} - a Promise that resolves after the image is sent.
     */
    showImage (args) {
        return this._peripheral.showImage(args.VALUE);
    }

    /**
     * Show image on the micro:bit display for a duration.
     * @param {object} args - the block's arguments.
     * @return {Promise} - a Promise that resolves after the duration.
     */
    showImageUntil (args) {
        const milliseconds = Math.max(0, Number(args.TIME) || 0) * 1000;
        return this._peripheral.showImage(args.VALUE).then(() => new Promise(resolve => {
            setTimeout(resolve, milliseconds);
        }))
            .then(() => this._peripheral.clearDisplay());
    }

    /**
     * Scroll text on the micro:bit display.
     * @param {object} args - the block's arguments.
     * @return {Promise} - a Promise that resolves after the command is sent.
     */
    show (args) {
        return this._peripheral.showText(args.TEXT, false);
    }

    /**
     * Scroll text and wait for completion on the micro:bit display.
     * @param {object} args - the block's arguments.
     * @return {Promise} - a Promise that resolves after the command is accepted.
     */
    showUntilScrollDone (args) {
        return this._peripheral.showText(args.TEXT, true);
    }

    /**
     * Turn a display pixel on or off.
     * @param {object} args - the block's arguments.
     * @return {Promise} - a Promise that resolves after the command is sent.
     */
    lightPixelAt (args) {
        const brightness = args.STATE === LedState.On ? 9 : 0;
        return this._peripheral.setPixel(args.X, args.Y, brightness);
    }

    /**
     * Set display pixel brightness.
     * @param {object} args - the block's arguments.
     * @return {Promise} - a Promise that resolves after the command is sent.
     */
    showOnPiexlbrightness (args) {
        return this._peripheral.setPixel(args.X, args.Y, args.BRT);
    }

    /**
     * Clear the micro:bit display.
     * @return {Promise} - a Promise that resolves after the display is cleared.
     */
    clearDisplay () {
        return this._peripheral.clearDisplay();
    }
}

module.exports = OpenBlockMicrobitDevice;
