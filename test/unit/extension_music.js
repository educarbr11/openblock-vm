const test = require('tap').test;
const Music = require('../../src/extensions/scratch3_music/index.js');

const fakeRuntime = {
    getTargetForStage: () => ({tempo: 60}),
    on: () => {} // Stub out listener methods used in constructor.
};

const blocks = new Music(fakeRuntime);

const util = {
    stackFrame: Object.create(null),
    target: {
        audioPlayer: null
    },
    yield: () => null
};

test('sound loading waits for the audio engine and only runs once', t => {
    const listeners = Object.create(null);
    const runtime = {
        audioEngine: null,
        getTargetForStage: () => ({tempo: 60}),
        on: (event, listener) => {
            listeners[event] = listener;
        }
    };
    const originalLoadAllSounds = Music.prototype._loadAllSounds;
    let loadCount = 0;
    Music.prototype._loadAllSounds = () => {
        loadCount++;
        return Promise.resolve();
    };

    const deferredBlocks = new Music(runtime);
    t.equal(loadCount, 0, 'does not load before an audio engine exists');
    runtime.audioEngine = {};
    listeners.AUDIO_ENGINE_ATTACHED();
    listeners.AUDIO_ENGINE_ATTACHED();
    t.equal(loadCount, 1, 'loads only once after the audio engine is attached');

    Music.prototype._loadAllSounds = originalLoadAllSounds;
    t.ok(deferredBlocks instanceof Music, 'constructs the extension while loading is deferred');
    t.end();
});

test('playDrum uses 1-indexing and wrap clamps', t => {
    // Stub playDrumNum
    let playedDrum;
    blocks._playDrumNum = (_util, drum) => (playedDrum = drum);

    let args = {DRUM: 1};
    blocks.playDrumForBeats(args, util);
    t.strictEqual(playedDrum, 0);

    args = {DRUM: blocks.DRUM_INFO.length + 1};
    blocks.playDrumForBeats(args, util);
    t.strictEqual(playedDrum, 0);

    t.end();
});

test('setInstrument uses 1-indexing and wrap clamps', t => {
    // Stub getMusicState
    const state = {currentInstrument: 0};
    blocks._getMusicState = () => state;

    let args = {INSTRUMENT: 1};
    blocks.setInstrument(args, util);
    t.strictEqual(state.currentInstrument, 0);

    args = {INSTRUMENT: blocks.INSTRUMENT_INFO.length + 1};
    blocks.setInstrument(args, util);
    t.strictEqual(state.currentInstrument, 0);

    t.end();
});
