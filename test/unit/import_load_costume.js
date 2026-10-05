const test = require('tap').test;
const {loadCostumeFromAsset} = require('../../src/import/load-costume');

test('uses the default bitmap when the original image cannot be decoded', t => {
    const originalCreateImageBitmap = global.createImageBitmap;
    const originalBlob = global.Blob;
    const originalDocument = global.document;
    const bitmapType = {contentType: 'image/png', runtimeFormat: 'png'};
    const originalAsset = {
        assetId: 'invalid-bitmap',
        assetType: bitmapType,
        data: new Uint8Array([1, 2, 3])
    };
    const defaultAsset = {
        assetId: 'default-bitmap',
        assetType: bitmapType,
        data: new Uint8Array([137, 80, 78, 71])
    };
    let decodeCount = 0;

    global.Blob = class Blob {
        constructor (parts) {
            this.parts = parts;
        }
    };
    global.createImageBitmap = () => {
        decodeCount += 1;
        if (decodeCount === 1) return Promise.reject(new Error('Image decode failed'));
        return Promise.resolve({height: 1, width: 1});
    };
    global.document = {
        createElement: () => ({
            getContext: () => ({drawImage: () => {}}),
            height: 0,
            width: 0
        })
    };

    t.teardown(() => {
        global.createImageBitmap = originalCreateImageBitmap;
        global.Blob = originalBlob;
        global.document = originalDocument;
    });

    const runtime = {
        renderer: {
            createBitmapSkin: () => 7,
            getSkinRotationCenter: () => [0.5, 0.5],
            getSkinSize: () => [1, 1]
        },
        storage: {
            AssetType: {
                ImageBitmap: bitmapType,
                ImageVector: {runtimeFormat: 'svg'}
            },
            defaultAssetId: {ImageBitmap: defaultAsset.assetId},
            get: assetId => {
                if (assetId === defaultAsset.assetId) return defaultAsset;
                return null;
            }
        },
        v2BitmapAdapter: {}
    };
    const costume = {
        asset: originalAsset,
        bitmapResolution: 2,
        dataFormat: 'png',
        name: 'Invalid costume'
    };

    return loadCostumeFromAsset(costume, runtime).then(loadedCostume => {
        t.equal(decodeCount, 2, 'decodes the fallback after the original fails');
        t.equal(loadedCostume.assetId, defaultAsset.assetId, 'uses the default bitmap asset');
        t.equal(loadedCostume.skinId, 7, 'creates a skin for the fallback bitmap');
        t.end();
    });
});
