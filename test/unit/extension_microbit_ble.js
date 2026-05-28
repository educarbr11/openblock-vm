const test = require('tap').test;
const Scratch3MicroBitBlocks = require('../../src/extensions/scratch3_microbit_ble/index.js');

const makeExtension = pinValues => {
    const runtime = {
        registerPeripheralExtension: () => {}
    };
    const extension = new Scratch3MicroBitBlocks(runtime);
    extension._peripheral = {
        _checkPinState: pin => pinValues[pin]
    };
    return extension;
};

test('microbit BLE exposes pin connection blocks', t => {
    const extension = makeExtension([0, 0, 0]);
    const blockOpcodes = extension.getInfo()[0].blocks
        .filter(block => typeof block === 'object')
        .map(block => block.opcode);

    t.same(
        blockOpcodes.filter(opcode => (
            opcode === 'whenPinConnected' ||
            opcode === 'isPinConnected' ||
            opcode === 'getPinValue'
        )),
        ['whenPinConnected', 'isPinConnected', 'getPinValue']
    );
    t.end();
});

test('microbit BLE reads valid touch pin values', t => {
    const extension = makeExtension([0, 1, 2]);

    t.equal(extension.isPinConnected({PIN: '0'}), false);
    t.equal(extension.isPinConnected({PIN: '1'}), true);
    t.equal(extension.isPinConnected({PIN: '2'}), true);

    t.equal(extension.getPinValue({PIN: '0'}), 0);
    t.equal(extension.getPinValue({PIN: '1'}), 1);
    t.equal(extension.getPinValue({PIN: '2'}), 1);
    t.end();
});

test('microbit BLE pin blocks handle invalid pins', t => {
    const extension = makeExtension([1, 1, 1]);

    t.equal(extension.isPinConnected({PIN: '-1'}), false);
    t.equal(extension.isPinConnected({PIN: '3'}), false);
    t.equal(extension.isPinConnected({PIN: 'abc'}), false);

    t.equal(extension.getPinValue({PIN: '-1'}), 0);
    t.equal(extension.getPinValue({PIN: '3'}), 0);
    t.equal(extension.getPinValue({PIN: 'abc'}), 0);
    t.end();
});
