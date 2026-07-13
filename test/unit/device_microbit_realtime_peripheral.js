const test = require('tap').test;

const MicrobitRealtimePeripheral = require('../../src/devices/common/microbit-realtime-peripheral');

const makePeripheral = () => {
    const calls = [];
    const runtime = {
        _hats: {},
        registerPeripheralExtension: () => {},
        setRealtimeBaudrate: () => {},
        isRealtimeMode: () => true,
        startHats: (opcode, fields) => calls.push({opcode, fields})
    };
    const peripheral = new MicrobitRealtimePeripheral(runtime, 'microbit', 'microbit', [], {
        baudRate: 115200
    }, {
        type: 'microbit'
    });
    return {peripheral, calls};
};

test('parse realtime response lines', t => {
    t.same(MicrobitRealtimePeripheral.parseResponseLine('OK 1'), {
        ok: true,
        value: '1',
        code: '1'
    });
    t.same(MicrobitRealtimePeripheral.parseResponseLine('OK 523'), {
        ok: true,
        value: '523',
        code: '523'
    });
    t.same(MicrobitRealtimePeripheral.parseResponseLine('ERR timeout'), {
        ok: false,
        value: 'timeout',
        code: 'timeout'
    });
    t.equal(MicrobitRealtimePeripheral.parseResponseLine('bad line').invalid, true);
    t.end();
});

test('button reporter sends BTN and parses OK 1 as true', t => {
    const {peripheral} = makePeripheral();
    peripheral._request = (command, fallback, parser) => {
        t.equal(command, 'BTN A');
        t.equal(fallback, false);
        return Promise.resolve(parser('1'));
    };

    peripheral.buttonIsPressed('a')
        .then(value => {
            t.equal(value, true);
            t.end();
        });
});

test('poll events trigger microbit button hat', t => {
    const {peripheral, calls} = makePeripheral();
    peripheral._handlePollEvent('1,0,0,0,0,0,');

    t.ok(calls.some(call => call.opcode === 'microbit_whenButtonPressed' &&
        call.fields.KEY === 'a'));
    t.ok(calls.some(call => call.opcode === 'microbit_microbit_whenButtonPressed' &&
        call.fields.KEY === 'a'));
    t.end();
});

test('micro:bit v2 input reporters send realtime commands', t => {
    const {peripheral} = makePeripheral();
    const commands = [];
    peripheral._request = (command, fallback, parser) => {
        commands.push(command);
        const responses = {
            'LOGO': '1',
            'SOUND': '173',
            'SOUNDTHRESH QUIET 64': '1'
        };
        return Promise.resolve(parser(responses[command]));
    };

    Promise.all([
        peripheral.logoIsPressed(),
        peripheral.soundLevel(),
        peripheral.setSoundThreshold('quiet', 64)
    ]).then(values => {
        t.same(commands, ['LOGO', 'SOUND', 'SOUNDTHRESH QUIET 64']);
        t.same(values, [true, 173, true]);
        t.end();
    });
});

test('poll events trigger logo and sound hats', t => {
    const {peripheral, calls} = makePeripheral();

    peripheral._handlePollEvent('0,0,0,0,0,0,,1,173,loud');
    peripheral._handlePollEvent('0,0,0,0,0,0,,0,42,quiet');

    t.ok(calls.some(call => call.opcode === 'microbit_whenLogo' &&
        call.fields.EVENT === 'pressed'));
    t.ok(calls.some(call => call.opcode === 'microbit_whenLogo' &&
        call.fields.EVENT === 'released'));
    t.ok(calls.some(call => call.opcode === 'microbit_microbit_whenLogo' &&
        call.fields.EVENT === 'pressed'));
    t.ok(calls.some(call => call.opcode === 'microbit_microbit_whenLogo' &&
        call.fields.EVENT === 'released'));
    t.ok(calls.some(call => call.opcode === 'microbit_whenSound' &&
        call.fields.EVENT === 'loud'));
    t.ok(calls.some(call => call.opcode === 'microbit_whenSound' &&
        call.fields.EVENT === 'quiet'));
    t.ok(calls.some(call => call.opcode === 'microbit_microbit_whenSound' &&
        call.fields.EVENT === 'loud'));
    t.ok(calls.some(call => call.opcode === 'microbit_microbit_whenSound' &&
        call.fields.EVENT === 'quiet'));
    t.end();
});

test('poll does not enqueue while serial request is active', t => {
    const {peripheral} = makePeripheral();
    const originalWindow = global.window;
    global.window = {
        setTimeout: () => 1,
        clearTimeout: () => {}
    };

    peripheral._isRealtimeConnected = true;
    peripheral.isConnected = () => true;
    peripheral._activeRequest = {};
    peripheral._request = () => {
        t.fail('POLL should not be requested while another request is active');
    };

    peripheral._pollEvents();
    t.equal(peripheral._eventPollTimeoutID, 1);
    global.window = originalWindow;
    t.end();
});

test('poll does not enqueue while user request is queued', t => {
    const {peripheral} = makePeripheral();
    const originalWindow = global.window;
    global.window = {
        setTimeout: () => 1,
        clearTimeout: () => {}
    };

    peripheral._isRealtimeConnected = true;
    peripheral.isConnected = () => true;
    peripheral._requestQueue.push({
        command: 'BTN A'
    });
    peripheral._request = () => {
        t.fail('POLL should not be requested while another request is queued');
    };

    peripheral._pollEvents();
    t.equal(peripheral._eventPollTimeoutID, 1);
    global.window = originalWindow;
    t.end();
});
