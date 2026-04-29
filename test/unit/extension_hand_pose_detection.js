const test = require('tap').test;
const HandPoseDetection = require('../../src/extensions/scratch3_hand_pose_detection/index.js');

const makeRuntime = () => {
    const runtime = {
        handPoseDetectionResult: null,
        opened: 0,
        emitted: 0,
        emit: event => {
            if (event === 'HAND_POSE_DETECTION_OPEN_RESULT') {
                runtime.emitted++;
            }
        },
        vm: {
            openHandPoseDetectionResult: () => {
                runtime.opened++;
            }
        }
    };
    return runtime;
};

let fakeRuntime = makeRuntime();

const stackClickUtil = {
    thread: {
        stackClick: true
    }
};

test('hand pose detection extension exposes expected blocks', t => {
    fakeRuntime = makeRuntime();
    const blocks = new HandPoseDetection(fakeRuntime);
    const info = blocks.getInfo()[0];
    const opcodes = info.blocks.map(block => block.opcode);

    t.strictEqual(info.id, 'handPoseDetection');
    t.same(opcodes, [
        'openResult',
        'whenGestureDetected',
        'handDetected',
        'handCount',
        'recognizedGesture',
        'handedness',
        'keypointPosition',
        'handConfidence'
    ]);
    t.same(info.menus.POINT.items[0], {
        text: 'pulso',
        value: 'wrist'
    });
    t.same(info.menus.POINT.items[4], {
        text: 'ponta do polegar',
        value: 'thumb_tip'
    });
    t.end();
});

test('hand pose detection reporters return empty defaults', t => {
    fakeRuntime = makeRuntime();
    const blocks = new HandPoseDetection(fakeRuntime);

    t.strictEqual(blocks.handDetected({}, {}), false);
    t.strictEqual(blocks.handCount({}, {}), 0);
    t.strictEqual(blocks.recognizedGesture({}, {}), '');
    t.strictEqual(blocks.handedness({HAND: 1}, {}), '');
    t.strictEqual(blocks.keypointPosition({HAND: 1, POINT: 'wrist', AXIS: 'x'}, {}), 0);
    t.strictEqual(blocks.handConfidence({HAND: 1}, {}), 0);
    t.strictEqual(blocks.whenGestureDetected({GESTURE: 'mão aberta', CONFIDENCE: 80}), false);
    t.end();
});

test('hand pose detection reporters read the latest result', t => {
    fakeRuntime = makeRuntime();
    fakeRuntime.handPoseDetectionResult = {
        handCount: 1,
        gesture: 'mão aberta',
        confidence: 92,
        hands: [{
            index: 1,
            handedness: 'right',
            score: 0.94,
            keypoints: [{
                name: 'wrist',
                x: 120,
                y: 80,
                z: -0.02
            }]
        }]
    };
    const blocks = new HandPoseDetection(fakeRuntime);

    t.strictEqual(blocks.handDetected({}, {}), true);
    t.strictEqual(blocks.handCount({}, {}), 1);
    t.strictEqual(blocks.recognizedGesture({}, {}), 'mão aberta');
    t.strictEqual(blocks.handedness({HAND: 1}, {}), 'right');
    t.strictEqual(blocks.keypointPosition({HAND: 1, POINT: 'wrist', AXIS: 'x'}, {}), 120);
    t.strictEqual(blocks.keypointPosition({HAND: 1, POINT: 'pulso', AXIS: 'x'}, {}), 120);
    t.strictEqual(blocks.keypointPosition({HAND: 1, POINT: 'wrist', AXIS: 'y'}, {}), 80);
    t.strictEqual(blocks.keypointPosition({HAND: 1, POINT: 'wrist', AXIS: 'z'}, {}), -0.02);
    t.strictEqual(blocks.handConfidence({HAND: 1}, {}), 94);
    t.strictEqual(blocks.whenGestureDetected({GESTURE: 'mão aberta', CONFIDENCE: 80}), true);
    t.strictEqual(blocks.whenGestureDetected({GESTURE: 'mão aberta', CONFIDENCE: 95}), false);
    t.end();
});

test('hand pose detection reporter click opens compact result window', t => {
    fakeRuntime = makeRuntime();
    fakeRuntime.handPoseDetectionResult = {
        handCount: 1,
        gesture: 'pinça',
        confidence: 90,
        hands: []
    };
    const blocks = new HandPoseDetection(fakeRuntime);

    t.strictEqual(blocks.recognizedGesture({}, stackClickUtil), 'pinça');
    t.strictEqual(fakeRuntime.opened, 1);
    t.end();
});
