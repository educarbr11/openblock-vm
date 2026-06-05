const test = require('tap').test;
const ScratchLinkWebBluetooth = require('../../src/util/scratch-link-web-bluetooth');

const wait = () => new Promise(resolve => setImmediate(resolve));

const makeDataView = bytes => {
    const array = new Uint8Array(bytes);
    return new DataView(array.buffer);
};

test('Web Bluetooth transport discovers, connects, notifies and writes', async t => {
    const messages = [];
    const characteristicListeners = {};
    const writes = [];
    const characteristic = {
        addEventListener: (eventName, listener) => {
            characteristicListeners[eventName] = listener;
        },
        startNotifications: () => Promise.resolve(),
        writeValueWithResponse: value => {
            writes.push(Array.from(value));
            return Promise.resolve();
        }
    };
    const server = {
        getPrimaryService: serviceId => {
            t.equal(serviceId, 0xf005);
            return Promise.resolve({
                getCharacteristic: characteristicId => {
                    t.equal(characteristicId, '5261da02-fa7e-42ab-850b-7c80220097cc');
                    return Promise.resolve(characteristic);
                }
            });
        }
    };
    const device = {
        id: 'mock-microbit',
        name: 'BBC micro:bit [zapev]',
        addEventListener: () => {},
        gatt: {
            connect: () => Promise.resolve(server)
        }
    };
    const originalNavigator = global.navigator;
    const originalWindow = global.window;
    Object.defineProperty(global, 'navigator', {
        configurable: true,
        value: {
            bluetooth: {
                requestDevice: options => {
                    t.same(options.optionalServices, [0xf005]);
                    return Promise.resolve(device);
                }
            },
            userActivation: {
                isActive: true
            }
        }
    });
    global.window = {
        atob: value => Buffer.from(value, 'base64').toString('binary'),
        btoa: value => Buffer.from(value, 'binary').toString('base64'),
        setTimeout: (fn, delay) => setTimeout(fn, delay)
    };
    t.teardown(() => {
        Object.defineProperty(global, 'navigator', {
            configurable: true,
            value: originalNavigator
        });
        global.window = originalWindow;
    });

    const socket = new ScratchLinkWebBluetooth('WEB_BLUETOOTH');
    socket.setOnOpen(() => {});
    socket.setOnClose(() => {});
    socket.setOnError(error => t.fail(error.message));
    socket.setHandleMessage(message => messages.push(message));

    socket.open();
    await wait();
    socket.sendMessage({
        jsonrpc: '2.0',
        id: 1,
        method: 'discover',
        params: {
            filters: [{services: [0xf005]}]
        }
    });
    await wait();

    const peripheralId = 'webbluetooth:mock-microbit';
    t.match(messages.find(message => message.method === 'didDiscoverPeripheral'), {
        jsonrpc: '2.0',
        method: 'didDiscoverPeripheral',
        params: {
            peripheralId,
            name: 'BBC micro:bit [zapev]'
        }
    });
    t.match(messages.find(message => message.method === 'userDidPickPeripheral'), {
        jsonrpc: '2.0',
        method: 'userDidPickPeripheral',
        params: {
            peripheralId,
            name: 'BBC micro:bit [zapev]'
        }
    });

    socket.sendMessage({
        jsonrpc: '2.0',
        id: 2,
        method: 'connect',
        params: {peripheralId}
    });
    await wait();

    socket.sendMessage({
        jsonrpc: '2.0',
        id: 3,
        method: 'startNotifications',
        params: {
            serviceId: 0xf005,
            characteristicId: '5261da02-fa7e-42ab-850b-7c80220097cc'
        }
    });
    await wait();
    characteristicListeners.characteristicvaluechanged({
        target: {
            value: makeDataView([1, 2, 3])
        }
    });

    t.match(messages.find(message => message.method === 'characteristicDidChange'), {
        jsonrpc: '2.0',
        method: 'characteristicDidChange',
        params: {
            encoding: 'base64',
            message: 'AQID'
        }
    });

    socket.sendMessage({
        jsonrpc: '2.0',
        id: 4,
        method: 'write',
        params: {
            serviceId: 0xf005,
            characteristicId: '5261da02-fa7e-42ab-850b-7c80220097cc',
            encoding: 'base64',
            message: 'BAU=',
            withResponse: true
        }
    });
    await wait();
    t.same(writes, [[4, 5]]);

    t.end();
});
