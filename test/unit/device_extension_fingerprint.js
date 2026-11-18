const test = require('tap').test;
const formatMessage = require('format-message');
const fs = require('fs');
const path = require('path');
const sandbox = require('vm');
const JSZip = require('jszip');
const ScratchStorage = require('scratch-storage');

const extensionRoot = path.resolve(__dirname, '../../../openblock-gui/static/device-extensions');
const getFingerprintMetadata = require(path.join(extensionRoot, 'fingerprint/index.js'));
const fingerprintTranslations = require(path.join(extensionRoot, 'fingerprint/translations.js'))
    .getInterfaceTranslations();
const scriptLoads = [];
let failScripts = false;
let missingRegistration = null;
let localExtensions = [];
require('loadjs');
require('node-fetch');
require.cache[require.resolve('loadjs')].exports = (urls, options) => {
    scriptLoads.push({urls, options});
    if (failScripts) return Promise.reject(new Error('missing script'));
    for (const url of urls) {
        const relative = url.replace(/^.*(?:device-extensions|extensions)\//, '');
        sandbox.runInThisContext(fs.readFileSync(path.join(extensionRoot, relative), 'utf8'), {filename: relative});
    }
    if (missingRegistration) global[missingRegistration] = null;
    return Promise.resolve();
};
require.cache[require.resolve('node-fetch')].exports = () =>
    Promise.resolve({json: () => Promise.resolve(localExtensions)});

const VirtualMachine = require('../../src/virtual-machine');
const Runtime = require('../../src/engine/runtime');

test('Fingerprint is discoverable in the static catalog with translated metadata', async t => {
    delete process.env.OPENBLOCK_LOCAL_RESOURCES;
    const vm = new VirtualMachine();
    for (const locale of ['en', 'pt-br']) {
        formatMessage.setup({locale});
        const manifest = getFingerprintMetadata(message =>
            fingerprintTranslations[locale][message.id] || message.default);
        const catalog = await vm.extensionManager.getDeviceExtensionsList();
        const entry = catalog.find(item => item.extensionId === 'fingerprint');
        t.ok(entry, `listed in ${locale}`);
        t.same(entry.supportDevice, manifest.supportDevice, 'catalog and plugin support the same boards');
        t.equal(entry.extensionId, manifest.extensionId, 'the extension ID matches the canonical plugin');
        t.equal(entry.version, manifest.version, 'the version matches the canonical plugin');
        t.equal(entry.name, manifest.name, 'the translated name matches the local resource catalog');
        t.equal(entry.resourceBaseUrl, '/static/device-extensions/');
        t.equal(entry.library, 'fingerprint/lib');
        t.equal(entry.name, locale === 'en' ? 'Fingerprint' : 'Leitor de digitais');
        for (const key of ['blocks', 'generator', 'toolbox', 'translations']) {
            t.ok(fs.existsSync(path.join(extensionRoot, entry[key])), `${key} exists`);
        }
    }
    vm.runtime.dispose();
});

test('loading, SB3 persistence, unloading and restoration keep the Fingerprint contract', async t => {
    const vm = new VirtualMachine();
    await vm.extensionManager.getDeviceExtensionsList();
    let registration;
    vm.on(Runtime.DEVICE_EXTENSION_ADDED, value => {
        registration = value;
    });
    await vm.extensionManager.loadDeviceExtension('fingerprint');
    t.equal(vm.extensionManager.isDeviceExtensionLoaded('fingerprint'), true);
    for (const key of ['defineBlocks', 'defineGenerators', 'defineMessages']) {
        t.type(registration[key], 'function', `${key} registered`);
    }
    t.match(vm.runtime._loadedDeviceExtensions.get('fingerprint').xml, /fingerprint_captureImage/);
    t.same(vm.runtime.getCurrentDeviceExtensionLibrary(), ['fingerprint/lib']);
    t.same(scriptLoads[scriptLoads.length - 1].urls, [
        '/static/device-extensions/fingerprint/toolbox.js',
        '/static/device-extensions/fingerprint/blocks.js',
        '/static/device-extensions/fingerprint/translations.js',
        '/static/device-extensions/fingerprint/generator.js'
    ]);
    const serialized = JSON.parse(vm.toJSON());
    t.same(serialized.deviceExtensions, ['fingerprint'], 'SB3 stores the stable ID');
    vm.extensionManager.unloadDeviceExtension('fingerprint');
    t.equal(vm.extensionManager.isDeviceExtensionLoaded('fingerprint'), false);
    await vm.installDeviceExtensions(serialized.deviceExtensions);
    t.equal(vm.extensionManager.isDeviceExtensionLoaded('fingerprint'), true, 'restored by project loader');
    const catalog = await vm.extensionManager.getDeviceExtensionsList();
    t.equal(catalog.find(entry => entry.extensionId === 'fingerprint').isLoaded, true);
    vm.runtime.dispose();
});

test('a real SB3 archive restores the Fingerprint device, blocks, fields and toolbox', async t => {
    const original = new VirtualMachine();
    const restored = new VirtualMachine();
    original.attachStorage(new ScratchStorage());
    restored.attachStorage(new ScratchStorage());
    try {
        // Reuse a valid stage and its embedded costume instead of relying on network assets.
        const fixture = await JSZip.loadAsync(fs.readFileSync(path.resolve(__dirname, '../fixtures/comments.sb3')));
        const project = JSON.parse(await fixture.file('project.json').async('string'));
        const stage = project.targets.find(target => target.isStage);
        stage.blocks = {
            fingerprintInit: {
                opcode: 'fingerprint_init',
                next: 'fingerprintStore',
                parent: null,
                inputs: {},
                fields: {RX: ['8'], TX: ['9'], BAUD: ['19200']},
                shadow: false,
                topLevel: true,
                x: 20,
                y: 20
            },
            fingerprintStore: {
                opcode: 'fingerprint_storeModel',
                next: null,
                parent: 'fingerprintInit',
                inputs: {ID: [1, [6, '7']]},
                fields: {},
                shadow: false,
                topLevel: false
            }
        };
        stage.comments = {};
        stage.sounds = [];
        project.targets = [stage];
        project.monitors = [];
        project.extensions = [];
        project.device = {deviceId: 'arduinoUno', type: 'arduino'};
        project.programMode = 'upload';
        project.deviceExtensions = ['fingerprint'];
        fixture.file('project.json', JSON.stringify(project));
        await original.loadProject(await fixture.generateAsync({type: 'nodebuffer'}));
        const archive = await original.saveProjectSb3();
        const bytes = Buffer.from(await archive.arrayBuffer());
        t.equal(bytes.slice(0, 2).toString(), 'PK', 'saveProjectSb3 produces a ZIP archive');
        const zip = await JSZip.loadAsync(bytes);
        const saved = JSON.parse(await zip.file('project.json').async('string'));
        t.same(saved.deviceExtensions, ['fingerprint'], 'the archive records the extension ID');
        t.equal(saved.targets[0].blocks.fingerprintStore.opcode, 'fingerprint_storeModel');

        let registrations = 0;
        restored.on(Runtime.DEVICE_EXTENSION_ADDED, () => {
            registrations++;
        });
        await restored.loadProject(bytes);

        t.equal(restored.runtime.getDevice().deviceId, 'arduinoUno', 'the board is restored');
        t.equal(restored.runtime.isRealtimeMode(), false, 'upload mode is restored');
        t.equal(registrations, 1, 'project loading registers the extension once');
        t.equal(restored.extensionManager.isDeviceExtensionLoaded('fingerprint'), true);
        t.same(restored.runtime.getCurrentDeviceExtensionLibrary(), ['fingerprint/lib']);
        t.match(restored.runtime._loadedDeviceExtensions.get('fingerprint').xml, /fingerprint_storeModel/,
            'the extension toolbox is available after restoring');

        const blocks = restored.runtime.getTargetForStage().blocks;
        const init = blocks.getBlock('fingerprintInit');
        const store = blocks.getBlock('fingerprintStore');
        t.equal(init.opcode, 'fingerprint_init');
        t.equal(init.fields.RX.value, '8');
        t.equal(init.fields.TX.value, '9');
        t.equal(init.fields.BAUD.value, '19200');
        t.equal(init.next, 'fingerprintStore', 'the command stack remains connected');
        t.equal(store.opcode, 'fingerprint_storeModel');
        t.equal(store.parent, 'fingerprintInit');
        t.equal(blocks.getBlock(store.inputs.ID.block).fields.NUM.value, '7',
            'the numeric ID input survives binary serialization and loading');
        t.same(JSON.parse(restored.toJSON()).deviceExtensions, ['fingerprint']);
    } finally {
        original.runtime.dispose();
        restored.runtime.dispose();
    }
});

test('local resources allow Fingerprint and reject unapproved or incomplete plugins', async t => {
    process.env.OPENBLOCK_LOCAL_RESOURCES = 'true';
    const manifest = getFingerprintMetadata(message => message.default);
    localExtensions = [
        {...manifest, library: '/local/extensions/fingerprint/lib'},
        {...manifest, extensionId: 'untrusted'},
        {...manifest, blocks: null, main: 'main.js'}
    ];
    const vm = new VirtualMachine();
    const catalog = await vm.extensionManager.getDeviceExtensionsList();
    t.equal(catalog.length, 1);
    t.equal(catalog[0].extensionId, 'fingerprint');
    t.equal(catalog[0].library, '/local/extensions/fingerprint/lib');
    vm.runtime.dispose();
    delete process.env.OPENBLOCK_LOCAL_RESOURCES;
});

test('a missing script rejects loading without registering a partial extension', async t => {
    const vm = new VirtualMachine();
    await vm.extensionManager.getDeviceExtensionsList();
    failScripts = true;
    try {
        await vm.extensionManager.loadDeviceExtension('fingerprint');
        t.fail('loading should reject when a script is missing');
    } catch (error) {
        t.match(String(error), /Error while load device extension/);
    }
    t.equal(vm.extensionManager.isDeviceExtensionLoaded('fingerprint'), false);
    failScripts = false;
    vm.runtime.dispose();
    formatMessage.setup({locale: 'en'});
});

test('missing script registrations reject loading before the runtime is changed', async t => {
    const vm = new VirtualMachine();
    await vm.extensionManager.getDeviceExtensionsList();
    missingRegistration = 'registerGenerators';
    try {
        await vm.extensionManager.loadDeviceExtension('fingerprint');
        t.fail('loading should reject when a script does not register its callback');
    } catch (error) {
        t.match(String(error), /Missing generator registration/);
    } finally {
        missingRegistration = null;
    }
    t.equal(vm.extensionManager.isDeviceExtensionLoaded('fingerprint'), false);
    t.same(vm.runtime.getCurrentDeviceExtensionLibrary(), []);
    await vm.extensionManager.loadDeviceExtension('fingerprint');
    t.equal(vm.extensionManager.isDeviceExtensionLoaded('fingerprint'), true, 'a corrected resource can be retried');
    vm.runtime.dispose();
});

test('a registration failure rolls back the runtime and allows retrying', async t => {
    const vm = new VirtualMachine();
    await vm.extensionManager.getDeviceExtensionsList();
    const failRegistration = () => {
        throw new Error('Invalid dropdown label');
    };
    let rollbacks = 0;
    vm.on(Runtime.DEVICE_EXTENSION_ADDED, failRegistration);
    vm.on(Runtime.DEVICE_EXTENSION_REMOVED, () => {
        rollbacks++;
    });
    try {
        await vm.extensionManager.loadDeviceExtension('fingerprint');
        t.fail('loading should reject when the editor cannot register the blocks');
    } catch (error) {
        t.match(String(error), /Invalid dropdown label/);
    }
    t.equal(vm.extensionManager.isDeviceExtensionLoaded('fingerprint'), false);
    t.same(vm.runtime.getCurrentDeviceExtensionLibrary(), [], 'does not keep an incomplete extension library');
    t.equal(rollbacks, 1, 'refreshes the toolbox after rolling back');
    const catalog = await vm.extensionManager.getDeviceExtensionsList();
    t.notOk(catalog.find(entry => entry.extensionId === 'fingerprint').isLoaded, 'catalog does not claim success');
    vm.removeListener(Runtime.DEVICE_EXTENSION_ADDED, failRegistration);
    await vm.extensionManager.loadDeviceExtension('fingerprint');
    t.equal(vm.extensionManager.isDeviceExtensionLoaded('fingerprint'), true);
    vm.runtime.dispose();
});
