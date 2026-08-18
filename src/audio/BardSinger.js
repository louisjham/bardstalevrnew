// BardSinger.js - Synthesizes Lute Accompaniment, Vocal Formants & Manages Floating Speech Lyrics
export class BardSinger {
  constructor(synth, onLyricChange) {
    this.synth = synth;
    this.onLyricChange = onLyricChange;
    this.isPlaying = false;
    this.currentVerseIndex = 0;
    this.timerId = null;

    // Classic Bard's Tale Lyrics for "The Evil in Skara Brae"
    this.lyrics = [
      { text: "🎵 Oh, hear the tale of Skara Brae...", notes: ['A3', 'C4', 'E4', 'A4'], vocalFreq: 220, duration: 4500 },
      { text: "🕯️ Where shadows fall and darkness stays...", notes: ['G3', 'B3', 'D4', 'G4'], vocalFreq: 196, duration: 4500 },
      { text: "💀 Mangar the Dark has cast his spell...", notes: ['F4', 'D4', 'A3', 'D4'], vocalFreq: 174, duration: 4500 },
      { text: "❄️ And locked the town in frozen hell...", notes: ['E4', 'G4', 'B4', 'E4'], vocalFreq: 164, duration: 4500 },
      { text: "⚔️ Gather your heroes, brave and bold...", notes: ['A3', 'C4', 'E4', 'A4'], vocalFreq: 220, duration: 4500 },
      { text: "🔥 Before the fires of man grow cold!", notes: ['D4', 'F4', 'A4', 'D4'], vocalFreq: 293, duration: 5000 }
    ];
  }

  startSong() {
    if (this.isPlaying) return;
    this.synth.init();
    this.isPlaying = true;
    this.currentVerseIndex = 0;
    this.playNextVerse();
  }

  stopSong() {
    this.isPlaying = false;
    if (this.timerId) clearTimeout(this.timerId);
    if (this.onLyricChange) this.onLyricChange("");
  }

  playNextVerse() {
    if (!this.isPlaying) return;

    const verse = this.lyrics[this.currentVerseIndex];

    // Trigger Floating Speech Bubble Lyric
    if (this.onLyricChange) {
      this.onLyricChange(verse.text);
    }

    // Play Lute Melody Sequence for verse
    this.synth.playSequence(verse.notes, 350);

    // Sing Vocal Melodic Formant Burst
    this.singVocalFormant(verse.vocalFreq, verse.duration * 0.7);

    // Advance to next verse recursively
    this.currentVerseIndex = (this.currentVerseIndex + 1) % this.lyrics.length;

    this.timerId = setTimeout(() => {
      this.playNextVerse();
    }, verse.duration);
  }

  singVocalFormant(fundamentalFreq, durationMs) {
    if (!this.synth.initialized) return;
    const ctx = this.synth.ctx;
    const now = ctx.currentTime;
    const durSec = durationMs / 1000;

    // Vocal Vocalization Oscillator (Sawtooth passed through vowel formant filters)
    const vocalOsc = ctx.createOscillator();
    vocalOsc.type = 'sawtooth';
    vocalOsc.frequency.setValueAtTime(fundamentalFreq, now);

    // Formant Filter 1 (Vowel "Ah" / "Oh" formant resonant filter)
    const formant1 = ctx.createBiquadFilter();
    formant1.type = 'bandpass';
    formant1.frequency.setValueAtTime(600, now);
    formant1.Q.setValueAtTime(4.0, now);

    // Formant Filter 2 (Upper resonance)
    const formant2 = ctx.createBiquadFilter();
    formant2.type = 'bandpass';
    formant2.frequency.setValueAtTime(1200, now);
    formant2.Q.setValueAtTime(5.0, now);

    const vocalGain = ctx.createGain();
    vocalGain.gain.setValueAtTime(0.001, now);
    vocalGain.gain.linearRampToValueAtTime(0.12, now + 0.3);
    vocalGain.gain.exponentialRampToValueAtTime(0.0001, now + durSec);

    vocalOsc.connect(formant1);
    vocalOsc.connect(formant2);
    formant1.connect(vocalGain);
    formant2.connect(vocalGain);

    if (this.synth.masterGain) {
      vocalGain.connect(this.synth.masterGain);
    } else {
      vocalGain.connect(ctx.destination);
    }

    vocalOsc.start(now);
    vocalOsc.stop(now + durSec);
  }
}
