// BardSynth.js - Procedural Web Audio API Lute Synthesizer with 3D Spatial Panning
export class BardSynth {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.panner = null;
    this.initialized = false;

    // Frequencies for standard lute notes
    this.noteFreqs = {
      'G3': 196.00,
      'A3': 220.00,
      'B3': 246.94,
      'C4': 261.63,
      'D4': 293.66,
      'E4': 329.63,
      'F4': 349.23,
      'G4': 392.00,
      'A4': 440.00,
      'B4': 493.88,
      'C5': 523.25
    };
  }

  init() {
    if (this.initialized) return;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.4;

    // Spatial Panner Node
    this.panner = this.ctx.createPanner();
    this.panner.panningModel = 'HRTF';
    this.panner.distanceModel = 'inverse';
    this.panner.refDistance = 1;
    this.panner.maxDistance = 10000;
    this.panner.rolloffFactor = 1;

    // Default position (Center of 3D Scene Lute)
    this.panner.positionX.value = 0;
    this.panner.positionY.value = 1.2;
    this.panner.positionZ.value = -1.5;

    this.masterGain.connect(this.panner);
    this.panner.connect(this.ctx.destination);

    this.initialized = true;
  }

  setSpatialPosition(x, y, z) {
    if (!this.initialized || !this.panner) return;
    this.panner.positionX.value = x;
    this.panner.positionY.value = y;
    this.panner.positionZ.value = z;
  }

  // Pluck a lute string using hybrid Karplus-Strong / additive synthesis
  pluckNote(noteName, duration = 2.5) {
    if (!this.initialized) this.init();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const freq = this.noteFreqs[noteName] || 440;
    const now = this.ctx.currentTime;

    // Primary Fundamental Oscillator (Triangle wave for warm wooden body tone)
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    // Overtone Oscillator (Sine wave 2nd harmonic for metallic string brightness)
    const harmonic = this.ctx.createOscillator();
    harmonic.type = 'sine';
    harmonic.frequency.setValueAtTime(freq * 2.005, now);

    // Pluck Transient (Burst of filtered noise for initial pick impact)
    const noiseBuffer = this.createPluckNoiseBuffer();
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(freq * 1.5, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    // Plucked Envelope (Fast attack, exponential decay)
    const noteGain = this.ctx.createGain();
    noteGain.gain.setValueAtTime(0.001, now);
    noteGain.gain.linearRampToValueAtTime(0.5, now + 0.008);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(noteGain);
    harmonic.connect(noteGain);
    noteGain.connect(this.masterGain);

    osc.start(now);
    harmonic.start(now);
    noiseSource.start(now);

    osc.stop(now + duration);
    harmonic.stop(now + duration);
  }

  createPluckNoiseBuffer() {
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // Play a song (sequence of notes)
  playSequence(notesArray, intervalMs = 280, callback) {
    if (!this.initialized) this.init();
    notesArray.forEach((note, index) => {
      setTimeout(() => {
        this.pluckNote(note);
        if (callback) callback(note, index);
      }, index * intervalMs);
    });
  }

  // Play realistic dynamic weapon whoosh / slice sound
  playSwordSwing(pitchMod = 1.0) {
    if (!this.initialized) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const dur = 0.22;

    // Filtered noise swoosh
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(3.0, now);
    filter.frequency.setValueAtTime(450 * pitchMod, now);
    filter.frequency.exponentialRampToValueAtTime(1400 * pitchMod, now + 0.08);
    filter.frequency.exponentialRampToValueAtTime(250 * pitchMod, now + dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.45, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + dur);
  }

  // Play metallic weapon unsheathe / grab shimmer sound
  playSwordDraw() {
    if (!this.initialized) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(2800, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(2200, now + 0.35);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.35);
  }
}
