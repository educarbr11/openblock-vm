const normalizeLocale = locale => (locale || '').replace('_', '-').toLowerCase();

const arduinoDevicePrefixes = [
    'arduinoEsp32',
    'arduinoEsp32S3',
    'arduinoEsp8266',
    'arduinoK210',
    'arduinoLeonardo',
    'arduinoMega2560',
    'arduinoRaspberryPiPico',
    'arduinoRaspberryPiPico2',
    'arduinoRaspberryPiPico2W',
    'arduinoRaspberryPiPicoW',
    'arduinoUno',
    'arduinoUnoR4Minima',
    'arduinoUnoR4Wifi'
];

const ptBrCommonSuffixes = {
    'modeMenu.input': 'entrada',
    'modeMenu.output': 'saida',
    'modeMenu.inputPullup': 'entrada pull-up',
    'modeMenu.inputPulldown': 'entrada pull-down',
    'levelMenu.high': 'alto',
    'levelMenu.low': 'baixo',
    'InterrupModeMenu.risingEdge': 'borda de subida',
    'InterrupModeMenu.fallingEdge': 'borda de descida',
    'InterrupModeMenu.changeEdge': 'mudanca de borda',
    'InterrupModeMenu.low': 'nivel baixo',
    'InterrupModeMenu.high': 'nivel alto',
    'eolMenu.warp': 'com quebra de linha',
    'eolMenu.noWarp': 'sem quebra de linha',
    'dataTypeMenu.integer': 'inteiro',
    'dataTypeMenu.decimal': 'decimal',
    'dataTypeMenu.string': 'texto',
    'category.pins': 'Pinos',
    'category.serial': 'Serial',
    'category.data': 'Dados',
    'category.display': 'Display',
    'pins.setPinMode': 'defina o modo do pino [PIN] para [MODE]',
    'pins.setDigitalOutput': 'defina a saida digital do pino [PIN] para [LEVEL]',
    'pins.setPwmOutput': 'defina a saida PWM do pino [PIN] para [OUT]',
    'pins.esp32SetPwmOutput': 'defina a saida PWM do pino [PIN] para [OUT]',
    'pins.esp32SetDACOutput': 'defina a saida DAC do pino [PIN] para [OUT]',
    'pins.readDigitalPin': 'leia o pino digital [PIN]',
    'pins.readAnalogPin': 'leia o pino analogico [PIN]',
    'pins.esp32ReadTouchPin': 'leia o pino touch [PIN]',
    'pins.setServoOutput': 'defina a saida do servo no pino [PIN] para [OUT]',
    'pins.esp32SetServoOutput': 'defina a saida do servo no pino [PIN] para [OUT]',
    'pins.attachInterrupt': 'quando ocorrer interrupcao no pino [PIN] no modo [MODE]',
    'pins.esp32AttachInterrupt': 'quando ocorrer interrupcao no pino [PIN] no modo [MODE]',
    'pins.esp8266AttachInterrupt': 'quando ocorrer interrupcao no pino [PIN] no modo [MODE]',
    'pins.detachInterrupt': 'desative a interrupcao do pino [PIN]',
    'pins.esp32DetachInterrupt': 'desative a interrupcao do pino [PIN]',
    'serial.serialBegin': 'inicie a serial com baud rate [VALUE]',
    'serial.multiSerialBegin': 'inicie a serial [NO] com baud rate [VALUE]',
    'serial.raspberryPiPicoMultiSerialBegin': 'inicie a serial [NO] com baud rate [VALUE]',
    'serial.serialPrint': 'imprima na serial [VALUE] [EOL]',
    'serial.multiSerialPrint': 'imprima na serial [NO] [VALUE] [EOL]',
    'serial.serialAvailable': 'quantidade de dados disponiveis na serial',
    'serial.multiSerialAvailable': 'quantidade de dados disponiveis na serial [NO]',
    'serial.serialReadAByte': 'leia um byte da serial',
    'serial.multiSerialReadAByte': 'leia um byte da serial [NO]',
    'data.dataMap': 'mapeie [DATA] de ([ARG0], [ARG1]) para ([ARG2], [ARG3])',
    'data.dataConstrain': 'restrinja [DATA] entre ([ARG0], [ARG1])',
    'data.dataConvert': 'converta [DATA] para [TYPE]',
    'data.dataConvertASCIICharacter': 'converta [DATA] para caractere ASCII',
    'data.dataConvertASCIINumber': 'converta [DATA] para numero ASCII',
    'ledState.on': 'ligado',
    'ledState.off': 'desligado',
    'display.showImage': 'mostre a imagem [VALUE]',
    'display.showImageUntil': 'mostre a imagem [VALUE] por [TIME] s',
    'display.showUntilScrollDone': 'mostre [TEXT] ate a rolagem terminar',
    'display.clearDisplay': 'limpe a tela',
    'display.lightPixelAt': 'acenda [STATE] em x: [X], y: [Y]'
};

const buildPtBrTranslations = () => {
    const translations = {};
    for (const prefix of arduinoDevicePrefixes) {
        for (const suffix of Object.keys(ptBrCommonSuffixes)) {
            translations[`${prefix}.${suffix}`] = ptBrCommonSuffixes[suffix];
        }
    }
    return translations;
};

const ptBrTranslations = buildPtBrTranslations();

const getArduinoDeviceTranslations = locale => {
    const normalizedLocale = normalizeLocale(locale);
    if (normalizedLocale === 'pt' || normalizedLocale === 'pt-br') {
        return ptBrTranslations;
    }
    return {};
};

module.exports = getArduinoDeviceTranslations;
