const test = require('tap').test;
const HandPoseDetection = require('../../src/extensions/scratch3_hand_pose_detection/index.js');

const makeRuntime = () => {
    const runtime = {
        handPoseDetectionResult: null,
        handPoseGestureModel: null,
        handPoseGesturePrediction: null,
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
            },
            startHandPoseDetection: () => Promise.resolve(),
            stopHandPoseDetection: () => Promise.resolve(),
            openHandPoseGestureTrainer: () => {
                runtime.trainerOpened = (runtime.trainerOpened || 0) + 1;
            },
            createHandPoseGesture: name => Promise.resolve(name),
            captureHandPoseGestureExample: classId => Promise.resolve(classId),
            captureHandPoseGestureExamplesForSeconds: (classId, seconds) => Promise.resolve({classId, seconds}),
            clearHandPoseGestureExamples: classId => Promise.resolve(classId)
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
    t.same(opcodes.filter(Boolean), [
        'startDetection',
        'stopDetection',
        'openResult',
        'openGestureTrainer',
        'createTrainedGesture',
        'addGestureExample',
        'captureGestureExamplesForSeconds',
        'clearGestureExamples',
        'gestureExampleCount',
        'gestureModelReady',
        'whenTrainedGestureDetected',
        'recognizedTrainedGesture',
        'trainedGestureConfidence',
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
    t.same(info.blocks.filter(block => block.hideFromPalette).map(block => block.opcode), [
        'createTrainedGesture',
        'addGestureExample',
        'captureGestureExamplesForSeconds',
        'clearGestureExamples',
        'gestureExampleCount',
        'gestureModelReady',
        'whenGestureDetected',
        'recognizedGesture'
    ]);
    t.end();
});

test('custom gesture menus keep stable class ids after renaming', t => {
    fakeRuntime = makeRuntime();
    fakeRuntime.handPoseGestureModel = {
        version: 1,
        featureVersion: 'canonical-landmarks-v1',
        classes: [
            {id: 'other', name: 'Outro', protected: true},
            {id: 'gesture-number-one', name: 'Número 1'}
        ],
        examples: [],
        active: false
    };
    const blocks = new HandPoseDetection(fakeRuntime);
    const menu = blocks.getInfo()[0].menus.TRAINED_GESTURES.items;

    t.same(menu, [
        {text: 'Outro', value: 'other'},
        {text: 'Número 1', value: 'gesture-number-one'}
    ]);
    fakeRuntime.handPoseGestureModel.classes[1].name = 'Indicador';
    t.same(blocks.getInfo()[0].menus.TRAINED_GESTURES.items[1], {
        text: 'Indicador',
        value: 'gesture-number-one'
    });
    t.end();
});

test('custom gesture reporters use persisted examples and predictions', t => {
    fakeRuntime = makeRuntime();
    const examples = [];
    for (let i = 0; i < 20; i++) {
        examples.push({classId: 'other', vector: [i]});
        examples.push({classId: 'number-one', vector: [i]});
    }
    fakeRuntime.handPoseGestureModel = {
        version: 1,
        featureVersion: 'canonical-landmarks-v1',
        classes: [
            {id: 'other', name: 'Outro', protected: true},
            {id: 'number-one', name: 'Número 1'}
        ],
        examples,
        active: true
    };
    fakeRuntime.handPoseGesturePrediction = {
        classId: 'number-one',
        label: 'Número 1',
        confidences: {'number-one': 91, 'other': 9}
    };
    const blocks = new HandPoseDetection(fakeRuntime);

    t.strictEqual(blocks.gestureExampleCount({GESTURE: 'number-one'}), 20);
    t.strictEqual(blocks.gestureModelReady(), true);
    t.strictEqual(blocks.recognizedTrainedGesture({}, {}), 'Número 1');
    t.strictEqual(blocks.trainedGestureConfidence({GESTURE: 'number-one'}), 91);
    t.strictEqual(blocks.whenTrainedGestureDetected({GESTURE: 'number-one', CONFIDENCE: 80}), true);
    t.strictEqual(blocks.whenTrainedGestureDetected({GESTURE: 'number-one', CONFIDENCE: 95}), false);
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
