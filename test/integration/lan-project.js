const test = require('tap').test;
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const ScratchStorage = require('scratch-storage');
const VirtualMachine = require('../../src/virtual-machine');
const LanSocket = require('../fixtures/lan-socket');

const prepareVm = () => {
    const vm = new VirtualMachine();
    const sockets = [];
    vm.attachStorage(new ScratchStorage());
    vm.runtime.getScratchLinkSocket = () => {
        const socket = new LanSocket();
        sockets.push(socket);
        return socket;
    };
    return {vm, sockets};
};

test('a real SB3 archive reloads the LAN category, five blocks and their arguments', async t => {
    const original = prepareVm();
    const restored = prepareVm();
    t.teardown(() => {
        for (const {vm} of [original, restored]) {
            vm.extensionManager.clearExtensions();
            vm.runtime.dispose();
        }
    });
    const fixture = await JSZip.loadAsync(fs.readFileSync(path.resolve(__dirname, '../fixtures/comments.sb3')));
    const project = JSON.parse(await fixture.file('project.json').async('string'));
    const stage = project.targets.find(target => target.isStage);
    stage.blocks = {
        'receive': {
            opcode: 'lan_whenReceived',
            next: 'say',
            parent: null,
            fields: {},
            inputs: {MESSAGE: [1, [10, 'classroom']]},
            shadow: false,
            topLevel: true,
            x: 20,
            y: 20
        },
        'say': {
            opcode: 'looks_say',
            next: null,
            parent: 'receive',
            fields: {},
            inputs: {MESSAGE: [3, 'value', [10, '']]},
            shadow: false,
            topLevel: false
        },
        'value': {
            opcode: 'lan_valueReceived',
            next: null,
            parent: 'say',
            fields: {},
            inputs: {MESSAGE: [1, [10, 'classroom']]},
            shadow: false,
            topLevel: false
        },
        'channel': {
            opcode: 'lan_setChannel',
            next: 'send-value',
            parent: null,
            fields: {CHANNEL: ['7']},
            inputs: {},
            shadow: false,
            topLevel: true,
            x: 20,
            y: 180
        },
        'send-value': {
            opcode: 'lan_broadcastWithValue',
            next: 'send-signal',
            parent: 'channel',
            fields: {},
            inputs: {MESSAGE: [1, [10, 'classroom']], VALUE: [1, [10, '23']]},
            shadow: false,
            topLevel: false
        },
        'send-signal': {
            opcode: 'lan_broadcast',
            next: null,
            parent: 'send-value',
            fields: {},
            inputs: {MESSAGE: [1, [10, 'ready']]},
            shadow: false,
            topLevel: false
        }
    };
    stage.comments = {};
    stage.sounds = [];
    project.targets = [stage];
    project.monitors = [];
    project.extensions = ['lan'];
    project.deviceExtensions = [];
    project.programMode = 'realtime';
    delete project.device;
    fixture.file('project.json', JSON.stringify(project));
    await original.vm.loadProject(await fixture.generateAsync({type: 'nodebuffer'}));
    const firstExtension = original.vm.extensionManager._loadedExtensionInstances.get('lan');
    await firstExtension._client.connect();
    original.sockets[original.sockets.length - 1].receive('classroom', 'runtime-only-value');
    t.equal(firstExtension.valueReceived({MESSAGE: 'classroom'}), 'runtime-only-value');

    const archive = await original.vm.saveProjectSb3();
    const bytes = Buffer.from(await archive.arrayBuffer());
    t.equal(bytes.slice(0, 2).toString(), 'PK', 'saves an actual ZIP archive');
    const savedZip = await JSZip.loadAsync(bytes);
    const savedJson = await savedZip.file('project.json').async('string');
    const saved = JSON.parse(savedJson);
    t.same(saved.extensions, ['lan'], 'records the stable builtin extension ID');
    t.notMatch(savedJson, /runtime-only-value/, 'received network values are not embedded in a project');

    await restored.vm.loadProject(bytes);
    const extension = restored.vm.extensionManager._loadedExtensionInstances.get('lan');
    t.ok(extension, 'project loading reinstalls LAN automatically');
    await extension._client.connect();
    t.equal(restored.vm.runtime.isRealtimeMode(), true);
    const blocks = restored.vm.runtime.getTargetForStage().blocks;
    for (const [id, opcode] of [['receive', 'whenReceived'], ['value', 'valueReceived'],
        ['channel', 'setChannel'], ['send-value', 'broadcastWithValue'], ['send-signal', 'broadcast']]) {
        t.equal(blocks.getBlock(id).opcode, `lan_${opcode}`, `${opcode} survives the round trip`);
    }
    t.equal(blocks.getBlock('channel').fields.CHANNEL.value, '7', 'saved channel block keeps its selection');
    const messageShadow = blocks.getBlock(blocks.getBlock('receive').inputs.MESSAGE.block);
    t.equal(messageShadow.fields.TEXT.value, 'classroom', 'message text survives compression');
    const valueShadow = blocks.getBlock(blocks.getBlock('send-value').inputs.VALUE.block);
    t.equal(valueShadow.fields.TEXT.value, '23', 'message values survive compression');
    t.equal(extension.valueReceived({MESSAGE: 'classroom'}), '', 'a new runtime starts without cached values');
    t.equal(extension._channel, 6, 'running the saved set-channel block remains an explicit action');
    t.ok(restored.vm.runtime._blockInfo.some(category => category.id === 'lan'), 'the category is restored');
});
