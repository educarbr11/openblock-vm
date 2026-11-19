const test = require('tap').test;
const VirtualMachine = require('../../src/virtual-machine');
const Runtime = require('../../src/engine/runtime');
const Sprite = require('../../src/sprites/sprite');
const BlockType = require('../../src/extension-support/block-type');
const LanSocket = require('../fixtures/lan-socket');

const makeVm = async () => {
    const vm = new VirtualMachine();
    vm.runtime.currentStepTime = 30;
    const sockets = [];
    vm.runtime.getScratchLinkSocket = () => {
        const socket = new LanSocket();
        sockets.push(socket);
        return socket;
    };
    vm.extensionManager.loadExtensionIdSync('lan');
    const extension = vm.extensionManager._loadedExtensionInstances.get('lan');
    await extension._client.connect();
    return {vm, socket: sockets[0], sockets, extension};
};

const createBlock = (target, id, opcode, options = {}) => {
    target.blocks.createBlock(Object.assign({id,
        opcode,
        next: null,
        parent: null,
        fields: {},
        inputs: {},
        shadow: false,
        topLevel: false}, options));
};

const addHat = (target, id, message, next) => {
    createBlock(target, id, 'lan_whenReceived', {
        next,
        topLevel: true,
        inputs: {MESSAGE: {name: 'MESSAGE', block: `${id}-name`, shadow: `${id}-name`}}
    });
    createBlock(target, `${id}-name`, 'text', {
        parent: id, shadow: true, fields: {TEXT: {name: 'TEXT', value: message}}
    });
};

const disposeVm = vm => {
    vm.extensionManager.clearExtensions();
    vm.runtime.dispose();
};

const addStage = runtime => {
    const target = new Sprite(null, runtime).createClone();
    target.isStage = true;
    runtime.addTarget(target);
    return target;
};

test('LAN registers five blocks, a retry button and stable channel options', async t => {
    const {vm, extension} = await makeVm();
    t.teardown(() => disposeVm(vm));
    const info = extension.getInfo()[0];
    t.equal(info.id, 'lan');
    t.same(info.blocks.filter(block => block.opcode).map(block => block.opcode),
        ['broadcast', 'broadcastWithValue', 'whenReceived', 'valueReceived', 'setChannel']);
    t.equal(info.blocks[0].blockType, BlockType.BUTTON);
    t.equal(info.blocks[0].func, 'LAN_CONNECT');
    t.equal(info.blocks.find(block => block.opcode === 'setChannel').arguments.CHANNEL.defaultValue, '6');
    t.same(info.menus.CHANNELS.items.map(item => item.value),
        Array.from({length: 16}, (_, index) => String(index + 1)));
    const category = vm.runtime._blockInfo.find(item => item.id === 'lan');
    t.ok(category, 'registered in the real VM toolbox');
    t.match(category.blocks[0].xml, /callbackKey="LAN_CONNECT"/);
    t.equal(category.blocks.find(block => block.info.opcode === 'valueReceived').json.checkboxInFlyout,
        undefined, 'a free-input reporter does not advertise a nonfunctional monitor');
});

test('LAN sends trimmed case-sensitive names, empty signals and scalar values', async t => {
    const {vm, socket, extension} = await makeVm();
    t.teardown(() => disposeVm(vm));
    await extension.broadcast({MESSAGE: '  Ready  '});
    await extension.broadcastWithValue({MESSAGE: 'ready', VALUE: 42});
    t.same(socket.requests.filter(request => request.method === 'broadcast').map(request => request.params), [
        {message: 'Ready', value: ''}, {message: 'ready', value: '42'}
    ]);
});

test('LAN validates channels and bounded Unicode messages before sending', async t => {
    const {vm, socket, extension} = await makeVm();
    t.teardown(() => disposeVm(vm));
    const errors = [];
    vm.on('LAN_STATUS', status => {
        if (status.status === 'error') errors.push(status.error);
    });
    const before = socket.requests.length;
    for (const channel of [0, 17, 6.5, 'bad']) await extension.setChannel({CHANNEL: channel});
    await extension.broadcast({MESSAGE: '   '});
    await extension.broadcast({MESSAGE: 'a'.repeat(129)});
    await extension.broadcastWithValue({MESSAGE: 'ok', VALUE: 'x'.repeat(1025)});
    t.equal(socket.requests.length, before, 'invalid inputs never reach the bridge');
    t.equal(errors.length, 7, 'invalid arguments are visible to the GUI');
    await extension.broadcastWithValue({MESSAGE: '🙂'.repeat(128), VALUE: '🙂'.repeat(1024)});
    t.equal(socket.requests.length, before + 1, 'limits count Unicode code points');
});

test('LAN reporters use the current channel and clear cached values when switching or opening a project', async t => {
    const {vm, socket, extension} = await makeVm();
    t.teardown(() => disposeVm(vm));
    t.equal(extension.valueReceived({MESSAGE: 'temperature'}), '');
    socket.receive('temperature', '23');
    socket.receive('Temperature', '27');
    t.equal(extension.valueReceived({MESSAGE: 'temperature'}), '23');
    t.equal(extension.valueReceived({MESSAGE: 'Temperature'}), '27');
    await extension.setChannel({CHANNEL: '7'});
    t.equal(extension.valueReceived({MESSAGE: 'temperature'}), '');
    socket.receive('temperature', 'old channel', 6);
    t.equal(extension.valueReceived({MESSAGE: 'temperature'}), '');
    socket.receive('temperature', 'new channel', 7);
    t.equal(extension.valueReceived({MESSAGE: 'temperature'}), 'new channel');
    vm.runtime.emit(Runtime.PROJECT_LOADED);
    await extension._client.connect();
    t.equal(extension.valueReceived({MESSAGE: 'temperature'}), '');
    t.equal(extension._channel, 6);
});

test('LAN scheduler preserves queued values, busy handlers and different message names', async t => {
    const {vm, socket, extension} = await makeVm();
    t.teardown(() => disposeVm(vm));
    const target = addStage(vm.runtime);
    addHat(target, 'a', 'A', 'capture-a');
    addHat(target, 'b', 'B', 'capture-b');
    createBlock(target, 'capture-a', 'test_capture_a', {parent: 'a', next: 'hold-a'});
    createBlock(target, 'hold-a', 'test_hold', {parent: 'capture-a'});
    createBlock(target, 'capture-b', 'test_capture_b', {parent: 'b'});
    const values = [];
    let hold = true;
    vm.runtime._primitives.test_capture_a = (args, util) =>
        values.push(['A', extension.valueReceived({MESSAGE: 'A'}, util)]);
    vm.runtime._primitives.test_capture_b = (args, util) =>
        values.push(['B', extension.valueReceived({MESSAGE: 'B'}, util)]);
    vm.runtime._primitives.test_hold = (args, util) => {
        if (hold) util.yield();
    };
    socket.receive('A', 'first');
    socket.receive('A', 'second');
    socket.receive('B', 'third');
    t.same(values, [], 'network callbacks queue scripts instead of running them asynchronously');
    vm.runtime._step();
    t.same(values.slice().sort(), [['A', 'first'], ['B', 'third']], 'each hat receives its own event value');
    const firstHandler = vm.runtime.threads.find(thread => thread.topBlock === 'a');
    socket.receive('B', 'fourth');
    vm.runtime._step();
    t.same(values.filter(item => item[0] === 'A'), [['A', 'first']], 'busy handler keeps its first event');
    t.same(values.filter(item => item[0] === 'B'), [['B', 'third'], ['B', 'fourth']]);
    t.ok(vm.runtime.threads.includes(firstHandler), 'unrelated messages never restart a running handler');
    hold = false;
    vm.runtime._step();
    vm.runtime._step();
    t.same(values.filter(item => item[0] === 'A'), [['A', 'first'], ['A', 'second']],
        'another message for a busy handler waits rather than being lost');
});

test('LAN hats evaluate reporter inputs through the real VM', async t => {
    const {vm, socket, extension} = await makeVm();
    t.teardown(() => disposeVm(vm));
    const target = addStage(vm.runtime);
    createBlock(target, 'dynamic', 'lan_whenReceived', {next: 'capture',
        topLevel: true,
        inputs: {MESSAGE: {name: 'MESSAGE', block: 'join-name', shadow: null}}});
    createBlock(target, 'join-name', 'operator_join', {parent: 'dynamic',
        inputs: {
            STRING1: {name: 'STRING1', block: 'prefix', shadow: 'prefix'},
            STRING2: {name: 'STRING2', block: 'suffix', shadow: 'suffix'}
        }});
    createBlock(target, 'prefix', 'text', {parent: 'join-name',
        shadow: true,
        fields: {TEXT: {name: 'TEXT', value: 'class'}}});
    createBlock(target, 'suffix', 'text', {parent: 'join-name',
        shadow: true,
        fields: {TEXT: {name: 'TEXT', value: 'room'}}});
    createBlock(target, 'capture', 'test_capture', {parent: 'dynamic'});
    const received = [];
    vm.runtime._primitives.test_capture = (args, util) =>
        received.push(extension.valueReceived({MESSAGE: 'classroom'}, util));
    socket.receive('CLASSROOM', 'wrong case');
    socket.receive('classroom', 'matches reporter');
    vm.runtime._step();
    t.same(received, ['matches reporter']);
});

test('Stop All prevents external hats until a green flag, command or retry resumes reception', async t => {
    const {vm, socket, extension} = await makeVm();
    t.teardown(() => disposeVm(vm));
    const target = addStage(vm.runtime);
    addHat(target, 'a', 'A', 'capture');
    createBlock(target, 'capture', 'test_capture', {parent: 'a'});
    let runs = 0;
    vm.runtime._primitives.test_capture = () => runs++;
    socket.receive('A');
    vm.runtime.stopAll();
    socket.receive('A');
    vm.runtime._step();
    t.equal(runs, 0, 'stop also clears already queued messages');
    vm.runtime.greenFlag();
    socket.receive('A');
    vm.runtime._step();
    t.equal(runs, 1);
    vm.runtime.stopAll();
    await extension.broadcast({MESSAGE: 'resume'});
    socket.receive('A');
    vm.runtime._step();
    t.equal(runs, 2);
    vm.runtime.stopAll();
    vm.runtime.emit('LAN_CONNECT_REQUEST');
    socket.receive('A');
    vm.runtime._step();
    t.equal(runs, 3);
});

test('LAN queue and value cache stay bounded and deleted scripts do not retain packets', async t => {
    const {vm, socket, extension} = await makeVm();
    t.teardown(() => disposeVm(vm));
    const target = addStage(vm.runtime);
    addHat(target, 'a', 'A', null);
    const errors = [];
    vm.on('LAN_STATUS', state => errors.push(state));
    for (let i = 0; i < 140; i++) socket.receive(`message-${i}`, String(i));
    t.equal(extension._pendingMessages.length, 128);
    t.equal(extension._receivedValues.size, 128);
    t.equal(extension._pendingMessages[0].message, 'message-12', 'overflow drops the oldest packet');
    t.ok(errors.some(state => state.error === 'message_queue_full'));
    target.blocks.deleteBlock('a');
    vm.runtime._step();
    t.equal(extension._pendingMessages.length, 0, 'removed scripts do not leave an undrainable queue');
});

test('LAN suspension releases network resources and preserves the selected channel on resume', async t => {
    const {vm, socket, sockets, extension} = await makeVm();
    t.teardown(() => disposeVm(vm));
    await extension.setChannel({CHANNEL: 7});
    socket.receive('A', 'before leaving editor', 7);
    vm.runtime.emit('LAN_DISCONNECT_REQUEST');
    t.equal(socket.closed, true, 'leaving the editor closes the socket');
    t.equal(extension._clientSuspended, true);
    t.equal(extension._pendingMessages.length, 0);
    t.equal(extension.valueReceived({MESSAGE: 'A'}), '', 'previous editor values are cleared');
    socket.receive('A', 'stale callback', 7);
    t.equal(extension.valueReceived({MESSAGE: 'A'}), '', 'closed clients cannot deliver packets');
    vm.runtime.emit('LAN_CONNECT_REQUEST');
    await extension._client.connect();
    t.equal(sockets.length, 2, 'returning to the editor creates a fresh client');
    t.same(sockets[1].requests[0].params, {channel: 7}, 'resume keeps the channel selection');
    sockets[1].receive('A', 'after returning', 7);
    t.equal(extension.valueReceived({MESSAGE: 'A'}), 'after returning');
    vm.runtime.emit('LAN_DISCONNECT_REQUEST');
    vm.runtime.greenFlag();
    await extension._client.connect();
    t.equal(sockets.length, 3, 'green flag also resumes a suspended client');
    vm.runtime.emit('LAN_DISCONNECT_REQUEST');
    await extension.broadcast({MESSAGE: 'resume from a command'});
    t.equal(sockets.length, 4, 'executing a command resumes a suspended client');
    t.same(sockets[3].requests[0].params, {channel: 7});
    vm.runtime.emit('LAN_DISCONNECT_REQUEST');
    vm.runtime.emit(Runtime.PROJECT_LOADED);
    t.equal(sockets.length, 4, 'a background project load does not undo editor suspension');
    t.equal(extension._channel, 6, 'a new project resets the channel for its next explicit connection');
});

test('an inactive editor cannot open LAN through loading, commands or background green flags', async t => {
    const vm = new VirtualMachine();
    t.teardown(() => disposeVm(vm));
    vm.runtime.lanEditorActive = false;
    const sockets = [];
    vm.runtime.getScratchLinkSocket = () => {
        const socket = new LanSocket();
        sockets.push(socket);
        return socket;
    };
    vm.extensionManager.loadExtensionIdSync('lan');
    const extension = vm.extensionManager._loadedExtensionInstances.get('lan');
    await extension.broadcast({MESSAGE: 'background loop'});
    await extension.broadcastWithValue({MESSAGE: 'background loop', VALUE: 'data'});
    await extension.setChannel({CHANNEL: 9});
    await extension.reconnect();
    vm.runtime.greenFlag();
    vm.runtime.emit('LAN_CONNECT_REQUEST');
    t.equal(sockets.length, 0, 'loading and scripts cannot connect while the editor is inactive');
    t.equal(extension._receivingEnabled, false);
    t.equal(extension._channel, 6, 'background scripts cannot change the selected channel');

    vm.runtime.lanEditorActive = true;
    vm.runtime.emit('LAN_CONNECT_REQUEST');
    await extension._client.connect();
    t.equal(sockets.length, 1, 'entering the editor enables the selected extension');
    await extension.setChannel({CHANNEL: 9});
    vm.runtime.lanEditorActive = false;
    vm.runtime.emit('LAN_DISCONNECT_REQUEST');
    t.equal(sockets[0].closed, true, 'deactivation closes the existing connection');
    for (let i = 0; i < 3; i++) await extension.broadcast({MESSAGE: 'still running loop'});
    await extension.setChannel({CHANNEL: 3});
    vm.runtime.greenFlag();
    vm.runtime.emit('LAN_CONNECT_REQUEST');
    t.equal(sockets.length, 1, 'a surviving VM loop cannot recreate a client outside the editor');
    t.equal(extension._channel, 9, 'the last editor channel is retained');
    t.equal(extension._receivingEnabled, false);
    vm.runtime.lanEditorActive = true;
    vm.runtime.emit('LAN_CONNECT_REQUEST');
    await extension._client.connect();
    t.equal(sockets.length, 2, 'returning to the editor reconnects normally');
    t.same(sockets[1].requests[0].params, {channel: 9});
});

test('unloading LAN closes its client and removes scheduler, project and retry listeners', async t => {
    const {vm, socket, extension} = await makeVm();
    t.teardown(() => vm.runtime.dispose());
    vm.extensionManager.unloadExtension('lan');
    t.equal(socket.closed, true);
    t.equal(extension._disposed, true);
    for (const event of ['BEFORE_EXECUTE', 'PROJECT_START', 'PROJECT_STOP_ALL', 'PROJECT_LOADED',
        'LAN_CONNECT_REQUEST', 'LAN_DISCONNECT_REQUEST']) {
        t.equal(vm.runtime.listeners(event).some(listener => listener === extension._dispatchPending ||
            listener === extension._onProjectStart || listener === extension._onStopAll ||
            listener === extension._onProjectLoaded || listener === extension.reconnect ||
            listener === extension.suspend), false, event);
    }
    t.equal(extension._client._retryTimer, null);
});
