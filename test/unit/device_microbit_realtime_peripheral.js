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

test('button reporter returns cached state without waiting for USB', t => {
    const {peripheral} = makePeripheral();
    let resolveRequest;
    let requestCount = 0;
    peripheral._isRealtimeConnected = true;
    peripheral.isConnected = () => true;
    peripheral._request = (command, fallback, parser) => {
        requestCount++;
        t.equal(command, 'BTN A');
        t.equal(fallback, false);
        return new Promise(resolve => {
            resolveRequest = value => resolve(parser(value));
        });
    };

    t.equal(peripheral.buttonIsPressed('a'), false);
    t.equal(peripheral.buttonIsPressed('a'), false);
    t.equal(requestCount, 1, 'coalesces reads while a refresh is pending');

    resolveRequest('1');
    Promise.resolve().then(() => {
        t.equal(peripheral.buttonIsPressed('a'), true);
        t.equal(requestCount, 1, 'respects the input refresh interval');
        t.end();
    });
});

test('accelerometer reporter refreshes in background', t => {
    const {peripheral} = makePeripheral();
    let resolveRequest;
    peripheral._isRealtimeConnected = true;
    peripheral.isConnected = () => true;
    peripheral._request = (command, fallback, parser) => {
        t.equal(command, 'ACC X');
        t.equal(fallback, 0);
        return new Promise(resolve => {
            resolveRequest = value => resolve(parser(value));
        });
    };

    t.equal(peripheral.axisAcceleration('x'), 0);
    resolveRequest('384');
    Promise.resolve().then(() => {
        t.equal(peripheral.axisAcceleration('x'), 384);
        t.end();
    });
});

test('poll response updates cached button reporters', t => {
    const {peripheral} = makePeripheral();
    peripheral._handlePollEvent('1,0,0,0,0,0,');

    t.equal(peripheral.buttonIsPressed('a'), true);
    t.equal(peripheral.buttonIsPressed('b'), false);
    t.end();
});

test('stopping realtime clears cached inputs', t => {
    const {peripheral} = makePeripheral();
    peripheral._inputCache['button:a'] = true;
    peripheral._inputCache['acceleration:x'] = 512;

    peripheral._stopRealtime();

    t.equal(peripheral.buttonIsPressed('a'), false);
    t.equal(peripheral.axisAcceleration('x'), 0);
    t.same(peripheral._inputCache, {});
    t.same(peripheral._inputRefreshState, {});
    t.end();
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

test('event poll uses the low-latency interval', t => {
    const {peripheral} = makePeripheral();
    const originalWindow = global.window;
    global.window = {
        setTimeout: (callback, delay) => {
            t.equal(delay, 25);
            return 1;
        },
        clearTimeout: () => {}
    };

    peripheral._isRealtimeConnected = true;
    peripheral.isConnected = () => true;

    peripheral._scheduleNextPoll();
    t.equal(peripheral._eventPollTimeoutID, 1);
    global.window = originalWindow;
    t.end();
});

test('event poll is queued before pending sensor refreshes', t => {
    const {peripheral} = makePeripheral();
    peripheral._isRealtimeConnected = true;
    peripheral.isConnected = () => true;
    peripheral._activeRequest = {};
    peripheral._requestQueue.push({
        command: 'ACC X'
    });

    peripheral._pollEvents();
    t.equal(peripheral._requestQueue.length, 2);
    t.equal(peripheral._requestQueue[0].command, 'POLL');
    t.equal(peripheral._requestQueue[1].command, 'ACC X');
    t.end();
});
