const test = require('tap').test;

const Runtime = require('../../src/engine/runtime');
const VirtualMachine = require('../../src/virtual-machine');

test('unloading video sensing releases the camera and allows reloading', t => {
    const vm = new VirtualMachine();
    let disableVideoCalls = 0;
    vm.runtime.ioDevices.video.disableVideo = () => {
        disableVideoCalls++;
    };

    vm.extensionManager.loadExtensionIdSync('videoSensing');
    const firstInstance = vm.extensionManager._loadedExtensionInstances.get('videoSensing');

    t.ok(firstInstance, 'tracks the internal extension instance');
    t.equal(vm.runtime.listenerCount(Runtime.PROJECT_LOADED), 1, 'registers the project listener');

    const callsBeforeUnload = disableVideoCalls;
    vm.extensionManager.unloadExtension('videoSensing');

    t.equal(disableVideoCalls, callsBeforeUnload + 1, 'disables the camera when unloaded');
    t.equal(firstInstance._disposed, true, 'marks the extension as disposed');
    t.equal(firstInstance._loopTimeout, null, 'stops the analysis loop');
    t.equal(vm.runtime.listenerCount(Runtime.PROJECT_LOADED), 0, 'removes the project listener');

    vm.extensionManager.loadExtensionIdSync('videoSensing');
    const secondInstance = vm.extensionManager._loadedExtensionInstances.get('videoSensing');

    t.ok(secondInstance, 'loads the extension again');
    t.not(secondInstance, firstInstance, 'uses a fresh extension instance');
    t.equal(secondInstance._disposed, false, 'the reloaded extension is active');

    const callsBeforeClear = disableVideoCalls;
    vm.extensionManager.clearExtensions();
    t.equal(disableVideoCalls, callsBeforeClear + 1, 'disables the camera when all extensions are cleared');
    t.equal(secondInstance._disposed, true, 'disposes the reloaded extension during a full clear');
    vm.runtime.dispose();
    t.end();
});
