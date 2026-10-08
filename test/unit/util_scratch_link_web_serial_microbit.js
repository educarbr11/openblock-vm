const test = require('tap').test;

const ScratchLinkWebSerial = require('../../src/util/scratch-link-web-serial');

test('discovers a micro:bit when another serial port is already authorized', t => {
    const originalNavigator = Object.getOwnPropertyDescriptor(global, 'navigator');
    const otherPort = {getInfo: () => ({usbVendorId: 0x2341, usbProductId: 0x0043})};
    const microbitPort = {getInfo: () => ({usbVendorId: 0x0D28, usbProductId: 0x0204})};
    let requestedFilters;
    Object.defineProperty(global, 'navigator', {
        configurable: true,
        value: {
            userActivation: {isActive: true},
            serial: {
                getPorts: () => Promise.resolve([otherPort]),
                requestPort: options => {
                    requestedFilters = options.filters;
                    return Promise.resolve(microbitPort);
                }
            }
        }
    });

    const socket = new ScratchLinkWebSerial('WEB_SERIAL');
    const discovered = [];
    socket._sendRemoteRequest = (method, params) => discovered.push({method, params});
    socket._discover({filters: {pnpid: ['USB\\VID_0D28&PID_0204']}})
        .then(() => {
            t.same(requestedFilters, [{usbVendorId: 0x0D28, usbProductId: 0x0204}]);
            t.equal(discovered.length, 1);
            t.equal(discovered[0].params.peripheralId, 'webserial:0D28:0204:0');
        })
        .catch(error => t.fail(error.message))
        .then(() => {
            if (originalNavigator) Object.defineProperty(global, 'navigator', originalNavigator);
            else delete global.navigator;
            t.end();
        });
});
