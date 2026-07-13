const normalizeLocale = locale => (locale || '').replace('_', '-').toLowerCase();

const arduinoDevicePrefixes = [
    'arduinoEsp32',
    'arduinoEsp32S3',
    'arduinoEsp8266',
    'arduinoK210',
    'arduinoLeonardo',
    'arduinoMega2560',
    'arduinoNano',
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
    'modeMenu.output': 'saída',
    'modeMenu.inputPullup': 'entrada pull-up',
    'modeMenu.inputPulldown': 'entrada pull-down',
    'levelMenu.high': 'ligado',
    'levelMenu.low': 'desligado',
    'distanceUnitMenu.cm': 'centímetros',
    'distanceUnitMenu.inch': 'polegadas',
    'InterrupModeMenu.risingEdge': 'borda de subida',
    'InterrupModeMenu.fallingEdge': 'borda de descida',
    'InterrupModeMenu.changeEdge': 'mudança de borda',
    'InterrupModeMenu.low': 'nível baixo',
    'InterrupModeMenu.high': 'nível alto',
    'eolMenu.warp': 'com quebra de linha',
    'eolMenu.noWarp': 'sem quebra de linha',
    'dataTypeMenu.integer': 'inteiro',
    'dataTypeMenu.decimal': 'decimal',
    'dataTypeMenu.string': 'texto',
    'category.pins': 'Pinos',
    'category.serial': 'Serial',
    'category.data': 'Dados',
    'category.display': 'Display',
    'pins.setPinMode': 'definir o modo do pino [PIN] para [MODE]',
    'pins.setDigitalOutput': 'definir a saída digital do pino [PIN] para [LEVEL]',
    'pins.setPwmOutput': 'definir a saída PWM do pino [PIN] para [OUT]',
    'pins.esp32SetPwmOutput': 'definir a saída PWM do pino [PIN] para [OUT]',
    'pins.esp32SetDACOutput': 'definir a saída DAC do pino [PIN] para [OUT]',
    'pins.readDigitalPin': 'ler o pino digital [PIN]',
    'pins.readAnalogPin': 'ler o pino analógico [PIN]',
    'pins.esp32ReadTouchPin': 'ler o pino touch [PIN]',
    'pins.setServoOutput': 'definir a saída do servo no pino [PIN] para [OUT]',
    'pins.esp32SetServoOutput': 'definir a saída do servo no pino [PIN] para [OUT]',
    'pins.playToneForSeconds': 'tocar som no pino [PIN] nota [NOTE] durante [SECONDS] segundos',
    'pins.playToneForBeat': 'tocar som no pino [PIN] nota [NOTE] durante [BEAT] de tempo',
    'pins.stopTone': 'parar som no pino [PIN]',
    'pins.readUltrasonicDistance': 'ler distância ultrassônica TRIG [TRIG] ECHO [ECHO] em [UNIT]',
    'pins.attachInterrupt': 'quando ocorrer interrupção no pino [PIN] no modo [MODE]',
    'pins.esp32AttachInterrupt': 'quando ocorrer interrupção no pino [PIN] no modo [MODE]',
    'pins.esp8266AttachInterrupt': 'quando ocorrer interrupção no pino [PIN] no modo [MODE]',
    'pins.detachInterrupt': 'desativar a interrupção do pino [PIN]',
    'pins.esp32DetachInterrupt': 'desativar a interrupção do pino [PIN]',
    'serial.serialBegin': 'iniciar a serial com baud rate [VALUE]',
    'serial.multiSerialBegin': 'iniciar a serial [NO] com baud rate [VALUE]',
    'serial.raspberryPiPicoMultiSerialBegin': 'iniciar a serial [NO] com baud rate [VALUE]',
    'serial.serialPrint': 'imprimir na serial [VALUE] [EOL]',
    'serial.multiSerialPrint': 'imprimir na serial [NO] [VALUE] [EOL]',
    'serial.serialAvailable': 'quantidade de dados disponíveis na serial',
    'serial.multiSerialAvailable': 'quantidade de dados disponíveis na serial [NO]',
    'serial.serialReadAByte': 'ler um byte da serial',
    'serial.multiSerialReadAByte': 'ler um byte da serial [NO]',
    'data.dataMap': 'mapear [DATA] de ([ARG0], [ARG1]) para ([ARG2], [ARG3])',
    'data.dataConstrain': 'restringir [DATA] entre ([ARG0], [ARG1])',
    'data.dataConvert': 'converter [DATA] para [TYPE]',
    'data.dataConvertASCIICharacter': 'converter [DATA] para caractere ASCII',
    'data.dataConvertASCIINumber': 'converter [DATA] para número ASCII',
    'ledState.on': 'ligado',
    'ledState.off': 'desligado',
    'display.showImage': 'mostrar a imagem [VALUE]',
    'display.showImageUntil': 'mostrar a imagem [VALUE] por [TIME] s',
    'display.showUntilScrollDone': 'mostrar [TEXT] até a rolagem terminar',
    'display.clearDisplay': 'limpar a tela',
    'display.lightPixelAt': 'acender [STATE] em x: [X], y: [Y]'
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
