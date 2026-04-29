const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const formatMessage = require('format-message');

// eslint-disable-next-line max-len
const blockIconURI = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI2IiB5PSI2IiB3aWR0aD0iMjgiIGhlaWdodD0iMjgiIHJ4PSI2IiBmaWxsPSIjNEI5Q0ZGIi8+PGNpcmNsZSBjeD0iMTQiIGN5PSIxNiIgcj0iMyIgZmlsbD0iI0ZGRiIvPjxjaXJjbGUgY3g9IjI2IiBjeT0iMTYiIHI9IjMiIGZpbGw9IiNGRkYiLz48cGF0aCBkPSJNMTMgMjVjNC41IDMuMiA5LjUgMy4yIDE0IDAiIHN0cm9rZT0iI0ZGRiIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiIGZpbGw9Im5vbmUiLz48cGF0aCBkPSJNMTIgN2wtMi00TTI4IDdsMi00IiBzdHJva2U9IiM0QjlDRkYiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PC9zdmc+';

class Scratch3MachineLearningBlocks {
    constructor (runtime) {
        this.runtime = runtime;
    }

    get EXTENSION_ID () {
        return 'machineLearning';
    }

    getInfo () {
        return [{
            id: 'machineLearning',
            name: formatMessage({
                id: 'machineLearning.categoryName',
                default: 'Machine Learning',
                description: 'Name of the machine learning extension'
            }),
            color1: '#4B9CFF',
            color2: '#3378D8',
            color3: '#255AA8',
            blockIconURI: blockIconURI,
            menuIconURI: blockIconURI,
            blocks: [
                {
                    opcode: 'openTrainer',
                    text: formatMessage({
                        id: 'machineLearning.openTrainer',
                        default: 'open machine learning training',
                        description: 'Command that opens the machine learning training screen'
                    }),
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'whenClassDetected',
                    text: formatMessage({
                        id: 'machineLearning.whenClassDetected',
                        default: 'when recognized [CLASS] with confidence > [CONFIDENCE]',
                        description: 'Hat that triggers when a class is recognized with enough confidence'
                    }),
                    blockType: BlockType.HAT,
                    arguments: {
                        CLASS: {
                            type: ArgumentType.STRING,
                            menu: 'CLASSES',
                            defaultValue: this._defaultClass()
                        },
                        CONFIDENCE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 80
                        }
                    }
                },
                {
                    opcode: 'recognizedClass',
                    text: formatMessage({
                        id: 'machineLearning.recognizedClass',
                        default: 'recognized class',
                        description: 'Reporter for the latest recognized machine learning class'
                    }),
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'confidenceForClass',
                    text: formatMessage({
                        id: 'machineLearning.confidenceForClass',
                        default: 'confidence of class [CLASS]',
                        description: 'Reporter for confidence of a machine learning class'
                    }),
                    blockType: BlockType.REPORTER,
                    arguments: {
                        CLASS: {
                            type: ArgumentType.STRING,
                            menu: 'CLASSES',
                            defaultValue: this._defaultClass()
                        }
                    }
                }
            ],
            menus: {
                CLASSES: {
                    acceptReporters: true,
                    items: this._classMenu()
                }
            }
        }];
    }

    openTrainer () {
        if (this.runtime.vm && typeof this.runtime.vm.openMachineLearningTrainer === 'function') {
            this.runtime.vm.openMachineLearningTrainer();
        } else {
            this.runtime.emit('MACHINE_LEARNING_OPEN_TRAINER');
        }
    }

    openResult () {
        if (this.runtime.vm && typeof this.runtime.vm.openMachineLearningResult === 'function') {
            this.runtime.vm.openMachineLearningResult();
        } else {
            this.runtime.emit('MACHINE_LEARNING_OPEN_RESULT');
        }
    }

    recognizedClass (args, util) {
        if (util && util.thread && util.thread.stackClick) {
            this.openResult();
        }
        const prediction = this.runtime.machineLearningPrediction || {};
        return prediction.label || '';
    }

    confidenceForClass (args) {
        const className = Cast.toString(args.CLASS);
        const prediction = this.runtime.machineLearningPrediction || {};
        const confidences = prediction.confidences || {};
        return Math.round(Cast.toNumber(confidences[className] || 0));
    }

    whenClassDetected (args) {
        const expectedClass = Cast.toString(args.CLASS);
        const minConfidence = Cast.toNumber(args.CONFIDENCE);
        const prediction = this.runtime.machineLearningPrediction || {};
        return prediction.label === expectedClass &&
            Cast.toNumber((prediction.confidences || {})[expectedClass] || 0) > minConfidence;
    }

    _defaultClass () {
        const labels = this._labels();
        return labels.length ? labels[0] : 'class 1';
    }

    _classMenu () {
        const labels = this._labels();
        if (!labels.length) {
            return [{
                text: 'class 1',
                value: 'class 1'
            }];
        }
        return labels.map(label => ({
            text: label,
            value: label
        }));
    }

    _labels () {
        const model = this.runtime.machineLearningModel || {};
        const classifier = model.imageClassifier || {};
        return Array.isArray(classifier.labels) ? classifier.labels : [];
    }
}

module.exports = Scratch3MachineLearningBlocks;
