const test = require('tap').test;
const Scratch3MicroBitBlocks = require('../../src/extensions/scratch3_microbit_ble/index.js');

const makeExtension = pinValues => {
    const setPinValueCalls = [];
    const runtime = {
        registerPeripheralExtension: () => {}
    };
    const extension = new Scratch3MicroBitBlocks(runtime);
    extension._peripheral = {
        _checkPinState: pin => pinValues[pin],
        setPinValue: (pin, value) => setPinValueCalls.push({pin, value})
    };
    extension.setPinValueCalls = setPinValueCalls;
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
            opcode === 'getPinValue' ||
            opcode === 'setPinValue'
        )),
        ['whenPinConnected', 'isPinConnected', 'getPinValue', 'setPinValue']
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

test('microbit BLE sets valid pin values', t => {
    const extension = makeExtension([0, 0, 0]);

    extension.setPinValue({PIN: '0', VALUE: '0'});
    extension.setPinValue({PIN: '1', VALUE: '1'});
    extension.setPinValue({PIN: '2', VALUE: 2});

    t.same(extension.setPinValueCalls, [
        {pin: 0, value: 0},
        {pin: 1, value: 1},
        {pin: 2, value: 1}
    ]);
    t.end();
});

test('microbit BLE set pin value ignores invalid pins', t => {
    const extension = makeExtension([0, 0, 0]);

    extension.setPinValue({PIN: '-1', VALUE: '1'});
    extension.setPinValue({PIN: '3', VALUE: '1'});
    extension.setPinValue({PIN: 'abc', VALUE: '1'});

    t.same(extension.setPinValueCalls, []);
    t.end();
});
