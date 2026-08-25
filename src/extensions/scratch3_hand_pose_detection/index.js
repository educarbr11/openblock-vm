const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const formatMessage = require('format-message');

// eslint-disable-next-line max-len
const blockIconURI = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI1IiB5PSI1IiB3aWR0aD0iMzAiIGhlaWdodD0iMzAiIHJ4PSI4IiBmaWxsPSIjMDBBNjc2Ii8+PHBhdGggZD0iTTEzIDI4TDE1IDIwTDE4IDEyTTE1IDIwTDIzIDE2TTIzIDE2TDI5IDExTTIzIDE2TDMwIDIzTTE1IDIwTDI2IDI5IiBzdHJva2U9IiNGRkYiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PGNpcmNsZSBjeD0iMTMiIGN5PSIyOCIgcj0iMi40IiBmaWxsPSIjRkQ5NTAwIi8+PGNpcmNsZSBjeD0iMTgiIGN5PSIxMiIgcj0iMi40IiBmaWxsPSIjRkQ5NTAwIi8+PGNpcmNsZSBjeD0iMjkiIGN5PSIxMSIgcj0iMi40IiBmaWxsPSIjRkQ5NTAwIi8+PGNpcmNsZSBjeD0iMzAiIGN5PSIyMyIgcj0iMi40IiBmaWxsPSIjRkQ5NTAwIi8+PGNpcmNsZSBjeD0iMjYiIGN5PSIyOSIgcj0iMi40IiBmaWxsPSIjRkQ5NTAwIi8+PC9zdmc+';

const POINTS = [
    {text: 'pulso', value: 'wrist'},
    {text: 'base do polegar', value: 'thumb_cmc'},
    {text: 'junta do polegar', value: 'thumb_mcp'},
    {text: 'articulação do polegar', value: 'thumb_ip'},
    {text: 'ponta do polegar', value: 'thumb_tip'},
    {text: 'base do indicador', value: 'index_finger_mcp'},
    {text: 'meio do indicador', value: 'index_finger_pip'},
    {text: 'articulação do indicador', value: 'index_finger_dip'},
    {text: 'ponta do indicador', value: 'index_finger_tip'},
    {text: 'base do dedo médio', value: 'middle_finger_mcp'},
    {text: 'meio do dedo médio', value: 'middle_finger_pip'},
    {text: 'articulação do dedo médio', value: 'middle_finger_dip'},
    {text: 'ponta do dedo médio', value: 'middle_finger_tip'},
    {text: 'base do anelar', value: 'ring_finger_mcp'},
    {text: 'meio do anelar', value: 'ring_finger_pip'},
    {text: 'articulação do anelar', value: 'ring_finger_dip'},
    {text: 'ponta do anelar', value: 'ring_finger_tip'},
    {text: 'base do mindinho', value: 'pinky_finger_mcp'},
    {text: 'meio do mindinho', value: 'pinky_finger_pip'},
    {text: 'articulação do mindinho', value: 'pinky_finger_dip'},
    {text: 'ponta do mindinho', value: 'pinky_finger_tip'}
];

const POINT_ALIASES = POINTS.reduce((aliases, point) => {
    aliases[point.value] = point.value;
    aliases[point.text] = point.value;
    return aliases;
}, {});

const GESTURES = ['mão aberta', 'mão fechada', 'apontando', 'pinça'];
const DEFAULT_CUSTOM_GESTURE_ID = 'other';

class Scratch3HandPoseDetectionBlocks {
    constructor (runtime) {
        this.runtime = runtime;
    }

    get EXTENSION_ID () {
        return 'handPoseDetection';
    }

    getInfo () {
        return [{
            id: 'handPoseDetection',
            name: formatMessage({
                id: 'handPoseDetection.categoryName',
                default: 'Hand Pose Detection',
                description: 'Name of the hand pose detection extension'
            }),
            color1: '#00A676',
            color2: '#008B63',
            color3: '#006B4D',
            blockIconURI: blockIconURI,
            menuIconURI: blockIconURI,
            blocks: [
                {
                    opcode: 'startDetection',
                    text: formatMessage({
                        id: 'handPoseDetection.startDetection',
                        default: 'start hand detector',
                        description: 'Command that starts the hand detector'
                    }),
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'stopDetection',
                    text: formatMessage({
                        id: 'handPoseDetection.stopDetection',
                        default: 'stop hand detector',
                        description: 'Command that stops the hand detector'
                    }),
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'openResult',
                    text: formatMessage({
                        id: 'handPoseDetection.openResult',
                        default: 'open hand detector',
                        description: 'Command that opens the hand pose detection result window'
                    }),
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'openGestureTrainer',
                    text: formatMessage({
                        id: 'handPoseDetection.openGestureTrainer',
                        default: 'open gesture training',
                        description: 'Command that opens custom hand gesture training'
                    }),
                    blockType: BlockType.COMMAND
                },
                '---',
                {
                    opcode: 'createTrainedGesture',
                    hideFromPalette: true,
                    text: formatMessage({
                        id: 'handPoseDetection.createTrainedGesture',
                        default: 'create gesture [NAME]',
                        description: 'Command that creates a custom hand gesture'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Número 1'
                        }
                    }
                },
                {
                    opcode: 'addGestureExample',
                    hideFromPalette: true,
                    text: formatMessage({
                        id: 'handPoseDetection.addGestureExample',
                        default: 'add example to gesture [GESTURE]',
                        description: 'Command that captures one custom gesture example'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        GESTURE: {
                            type: ArgumentType.STRING,
                            menu: 'TRAINED_GESTURES',
                            defaultValue: this._defaultTrainedGesture()
                        }
                    }
                },
                {
                    opcode: 'captureGestureExamplesForSeconds',
                    hideFromPalette: true,
                    text: formatMessage({
                        id: 'handPoseDetection.captureGestureExamplesForSeconds',
                        default: 'capture examples of gesture [GESTURE] for [SECONDS] seconds',
                        description: 'Command that captures custom gesture examples for a duration'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        GESTURE: {
                            type: ArgumentType.STRING,
                            menu: 'TRAINED_GESTURES',
                            defaultValue: this._defaultTrainedGesture()
                        },
                        SECONDS: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 3
                        }
                    }
                },
                {
                    opcode: 'clearGestureExamples',
                    hideFromPalette: true,
                    text: formatMessage({
                        id: 'handPoseDetection.clearGestureExamples',
                        default: 'delete examples of gesture [GESTURE]',
                        description: 'Command that deletes custom gesture examples'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        GESTURE: {
                            type: ArgumentType.STRING,
                            menu: 'TRAINED_GESTURES',
                            defaultValue: this._defaultTrainedGesture()
                        }
                    }
                },
                {
                    opcode: 'gestureExampleCount',
                    hideFromPalette: true,
                    text: formatMessage({
                        id: 'handPoseDetection.gestureExampleCount',
                        default: 'number of examples of gesture [GESTURE]',
                        description: 'Reporter for custom gesture example count'
                    }),
                    blockType: BlockType.REPORTER,
                    arguments: {
                        GESTURE: {
                            type: ArgumentType.STRING,
                            menu: 'TRAINED_GESTURES',
                            defaultValue: this._defaultTrainedGesture()
                        }
                    }
                },
                {
                    opcode: 'gestureModelReady',
                    hideFromPalette: true,
                    text: formatMessage({
                        id: 'handPoseDetection.gestureModelReady',
                        default: 'gesture model ready?',
                        description: 'Boolean reporter for custom gesture model readiness'
                    }),
                    blockType: BlockType.BOOLEAN
                },
                {
                    opcode: 'whenTrainedGestureDetected',
                    text: formatMessage({
                        id: 'handPoseDetection.whenTrainedGestureDetected',
                        default: 'when trained gesture [GESTURE] is recognized ' +
                            'with confidence greater than [CONFIDENCE] %',
                        description: 'Hat that triggers for a trained hand gesture'
                    }),
                    blockType: BlockType.HAT,
                    arguments: {
                        GESTURE: {
                            type: ArgumentType.STRING,
                            menu: 'TRAINED_GESTURES',
                            defaultValue: this._defaultTrainedGesture()
                        },
                        CONFIDENCE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 80
                        }
                    }
                },
                {
                    opcode: 'recognizedTrainedGesture',
                    text: formatMessage({
                        id: 'handPoseDetection.recognizedTrainedGesture',
                        default: 'recognized trained gesture',
                        description: 'Reporter for the recognized trained hand gesture'
                    }),
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'trainedGestureConfidence',
                    text: formatMessage({
                        id: 'handPoseDetection.trainedGestureConfidence',
                        default: 'confidence of trained gesture [GESTURE]',
                        description: 'Reporter for confidence of a trained hand gesture'
                    }),
                    blockType: BlockType.REPORTER,
                    arguments: {
                        GESTURE: {
                            type: ArgumentType.STRING,
                            menu: 'TRAINED_GESTURES',
                            defaultValue: this._defaultTrainedGesture()
                        }
                    }
                },
                '---',
                {
                    opcode: 'whenGestureDetected',
                    hideFromPalette: true,
                    text: formatMessage({
                        id: 'handPoseDetection.whenGestureDetected',
                        default: 'when detect gesture [GESTURE] with confidence > [CONFIDENCE]',
                        description: 'Hat that triggers when a hand gesture is detected with enough confidence'
                    }),
                    blockType: BlockType.HAT,
                    arguments: {
                        GESTURE: {
                            type: ArgumentType.STRING,
                            menu: 'GESTURE',
                            defaultValue: GESTURES[0]
                        },
                        CONFIDENCE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 80
                        }
                    }
                },
                {
                    opcode: 'handDetected',
                    text: formatMessage({
                        id: 'handPoseDetection.handDetected',
                        default: 'hand detected?',
                        description: 'Boolean reporter for whether any hand is currently detected'
                    }),
                    blockType: BlockType.BOOLEAN
                },
                {
                    opcode: 'handCount',
                    text: formatMessage({
                        id: 'handPoseDetection.handCount',
                        default: 'hand count',
                        description: 'Reporter for the number of detected hands'
                    }),
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'recognizedGesture',
                    hideFromPalette: true,
                    text: formatMessage({
                        id: 'handPoseDetection.recognizedGesture',
                        default: 'recognized gesture',
                        description: 'Reporter for the current recognized hand gesture'
                    }),
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'handedness',
                    text: formatMessage({
                        id: 'handPoseDetection.handedness',
                        default: 'side of hand [HAND]',
                        description: 'Reporter for the handedness of a detected hand'
                    }),
                    blockType: BlockType.REPORTER,
                    arguments: {
                        HAND: {
                            type: ArgumentType.NUMBER,
                            menu: 'HAND',
                            defaultValue: 1
                        }
                    }
                },
                {
                    opcode: 'keypointPosition',
                    text: formatMessage({
                        id: 'handPoseDetection.keypointPosition',
                        default: 'position [AXIS] of point [POINT] of hand [HAND]',
                        description: 'Reporter for a hand keypoint coordinate'
                    }),
                    blockType: BlockType.REPORTER,
                    arguments: {
                        AXIS: {
                            type: ArgumentType.STRING,
                            menu: 'AXIS',
                            defaultValue: 'x'
                        },
                        POINT: {
                            type: ArgumentType.STRING,
                            menu: 'POINT',
                            defaultValue: 'wrist'
                        },
                        HAND: {
                            type: ArgumentType.NUMBER,
                            menu: 'HAND',
                            defaultValue: 1
                        }
                    }
                },
                {
                    opcode: 'handConfidence',
                    text: formatMessage({
                        id: 'handPoseDetection.handConfidence',
                        default: 'confidence of hand [HAND]',
                        description: 'Reporter for a detected hand confidence'
                    }),
                    blockType: BlockType.REPORTER,
                    arguments: {
                        HAND: {
                            type: ArgumentType.NUMBER,
                            menu: 'HAND',
                            defaultValue: 1
                        }
                    }
                }
            ],
            menus: {
                HAND: {
                    acceptReporters: true,
                    items: [
                        {text: '1', value: 1},
                        {text: '2', value: 2}
                    ]
                },
                AXIS: {
                    acceptReporters: true,
                    items: ['x', 'y', 'z']
                },
                POINT: {
                    acceptReporters: true,
                    items: POINTS
                },
                GESTURE: {
                    acceptReporters: true,
                    items: GESTURES
                },
                TRAINED_GESTURES: {
                    acceptReporters: true,
                    items: this._trainedGestureMenu()
                }
            }
        }];
    }

    openResult () {
        if (this.runtime.vm && typeof this.runtime.vm.openHandPoseDetectionResult === 'function') {
            this.runtime.vm.openHandPoseDetectionResult();
        } else {
            this.runtime.emit('HAND_POSE_DETECTION_OPEN_RESULT');
        }
    }

    startDetection () {
        if (this.runtime.vm && typeof this.runtime.vm.startHandPoseDetection === 'function') {
            return this.runtime.vm.startHandPoseDetection();
        }
        this.openResult();
    }

    stopDetection () {
        if (this.runtime.vm && typeof this.runtime.vm.stopHandPoseDetection === 'function') {
            return this.runtime.vm.stopHandPoseDetection();
        }
    }

    openGestureTrainer () {
        if (this.runtime.vm && typeof this.runtime.vm.openHandPoseGestureTrainer === 'function') {
            this.runtime.vm.openHandPoseGestureTrainer();
        } else {
            this.runtime.emit('HAND_POSE_DETECTION_OPEN_TRAINER');
        }
    }

    createTrainedGesture (args) {
        const name = Cast.toString(args.NAME).trim()
            .slice(0, 40);
        if (!name || !this.runtime.vm || typeof this.runtime.vm.createHandPoseGesture !== 'function') return;
        this.openGestureTrainer();
        return this.runtime.vm.createHandPoseGesture(name);
    }

    addGestureExample (args) {
        if (!this.runtime.vm || typeof this.runtime.vm.captureHandPoseGestureExample !== 'function') return;
        this.openGestureTrainer();
        return this.runtime.vm.captureHandPoseGestureExample(Cast.toString(args.GESTURE));
    }

    captureGestureExamplesForSeconds (args) {
        if (!this.runtime.vm || typeof this.runtime.vm.captureHandPoseGestureExamplesForSeconds !== 'function') return;
        const seconds = Math.max(1, Math.min(10, Cast.toNumber(args.SECONDS) || 3));
        this.openGestureTrainer();
        return this.runtime.vm.captureHandPoseGestureExamplesForSeconds(Cast.toString(args.GESTURE), seconds);
    }

    clearGestureExamples (args) {
        if (!this.runtime.vm || typeof this.runtime.vm.clearHandPoseGestureExamples !== 'function') return;
        return this.runtime.vm.clearHandPoseGestureExamples(Cast.toString(args.GESTURE));
    }

    gestureExampleCount (args) {
        const classId = Cast.toString(args.GESTURE);
        return this._examples().filter(example => example && example.classId === classId).length;
    }

    gestureModelReady () {
        const model = this._gestureModel();
        if (!model.active || model.incompatible) return false;
        return this._gestureClasses().length >= 2 && this._gestureClasses().every(item =>
            this._examples().filter(example => example && example.classId === item.id).length >= 20
        );
    }

    whenTrainedGestureDetected (args) {
        const classId = Cast.toString(args.GESTURE);
        const prediction = this._gesturePrediction();
        return prediction.classId === classId &&
            Cast.toNumber((prediction.confidences || {})[classId] || 0) > Cast.toNumber(args.CONFIDENCE);
    }

    recognizedTrainedGesture (args, util) {
        this._openResultIfStackClick(util);
        const prediction = this._gesturePrediction();
        return prediction.classId === DEFAULT_CUSTOM_GESTURE_ID ? '' : (prediction.label || '');
    }

    trainedGestureConfidence (args) {
        const classId = Cast.toString(args.GESTURE);
        return Math.round(Cast.toNumber((this._gesturePrediction().confidences || {})[classId] || 0));
    }

    handDetected (args, util) {
        this._openResultIfStackClick(util);
        return this._result().handCount > 0;
    }

    handCount (args, util) {
        this._openResultIfStackClick(util);
        return this._result().handCount || 0;
    }

    recognizedGesture (args, util) {
        this._openResultIfStackClick(util);
        return this._result().gesture || '';
    }

    handedness (args, util) {
        this._openResultIfStackClick(util);
        const hand = this._hand(args.HAND);
        return hand ? hand.handedness || '' : '';
    }

    keypointPosition (args, util) {
        this._openResultIfStackClick(util);
        const hand = this._hand(args.HAND);
        if (!hand || !Array.isArray(hand.keypoints)) return 0;
        const pointName = this._normalizePointName(args.POINT);
        const axis = Cast.toString(args.AXIS).toLowerCase();
        if (['x', 'y', 'z'].indexOf(axis) === -1) return 0;
        const point = hand.keypoints.find(item => item && item.name === pointName);
        return point ? Cast.toNumber(point[axis]) : 0;
    }

    handConfidence (args, util) {
        this._openResultIfStackClick(util);
        const hand = this._hand(args.HAND);
        return hand ? Math.round(Cast.toNumber(hand.score) * 100) : 0;
    }

    whenGestureDetected (args) {
        const result = this._result();
        const expectedGesture = Cast.toString(args.GESTURE);
        const minConfidence = Cast.toNumber(args.CONFIDENCE);
        return result.gesture === expectedGesture && Cast.toNumber(result.confidence || 0) > minConfidence;
    }

    _openResultIfStackClick (util) {
        if (util && util.thread && util.thread.stackClick) {
            this.openResult();
        }
    }

    _result () {
        return this.runtime.handPoseDetectionResult || {
            handCount: 0,
            gesture: '',
            confidence: 0,
            hands: []
        };
    }

    _hand (handIndex) {
        const index = Math.max(1, Math.round(Cast.toNumber(handIndex || 1)));
        const hands = this._result().hands || [];
        return hands.find(hand => hand && hand.index === index) || hands[index - 1] || null;
    }

    _normalizePointName (pointName) {
        const key = Cast.toString(pointName);
        return POINT_ALIASES[key] || key;
    }

    _gestureModel () {
        return this.runtime.handPoseGestureModel || {};
    }

    _gesturePrediction () {
        return this.runtime.handPoseGesturePrediction || {
            classId: '',
            label: '',
            confidences: {}
        };
    }

    _gestureClasses () {
        const classes = this._gestureModel().classes;
        return Array.isArray(classes) ? classes : [];
    }

    _examples () {
        const examples = this._gestureModel().examples;
        return Array.isArray(examples) ? examples : [];
    }

    _defaultTrainedGesture () {
        const classes = this._gestureClasses();
        const customClass = classes.find(item => item && !item.protected);
        return customClass ? customClass.id : DEFAULT_CUSTOM_GESTURE_ID;
    }

    _trainedGestureMenu () {
        const classes = this._gestureClasses();
        if (!classes.length) {
            return [{
                text: 'Outro',
                value: DEFAULT_CUSTOM_GESTURE_ID
            }];
        }
        return classes.map(item => ({
            text: item.name,
            value: item.id
        }));
    }
}

module.exports = Scratch3HandPoseDetectionBlocks;
