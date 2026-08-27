// All sound is synthesised at runtime with the Web Audio API - no audio files,
// so the game stays a single folder of text and works offline.

const MUTE_KEY = 'pixelblast.muted';

export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.musicTimer = null;
    this.musicStep = 0;
    this.muted = localStorage.getItem(MUTE_KEY) === '1';
  }

  /** Browsers only allow audio after a gesture, so this is called on first input. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;

    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.16;
    this.musicGain.connect(this.master);
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  /** One synth voice: a pitch sweep with a short envelope. */
  tone({ type = 'square', from = 440, to = from, duration = 0.12, volume = 0.3, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    const start = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + duration);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain);
    gain.connect(this.master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  /** Filtered white noise - explosions, hits, landings. */
  noise({ duration = 0.2, volume = 0.3, from = 1200, to = 200, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    const start = this.ctx.currentTime + delay;
    const frames = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(from, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, to), start + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(start);
  }

  jump() { this.tone({ type: 'square', from: 320, to: 640, duration: 0.12, volume: 0.22 }); }
  doubleJump() { this.tone({ type: 'square', from: 460, to: 880, duration: 0.12, volume: 0.2 }); }
  shoot() { this.tone({ type: 'sawtooth', from: 900, to: 220, duration: 0.09, volume: 0.16 }); }
  hit() { this.noise({ duration: 0.1, volume: 0.25, from: 2400, to: 600 }); }
  kill() {
    this.noise({ duration: 0.24, volume: 0.32, from: 1800, to: 120 });
    this.tone({ type: 'square', from: 220, to: 60, duration: 0.22, volume: 0.18 });
  }
  coin() {
    this.tone({ type: 'square', from: 988, duration: 0.06, volume: 0.18 });
    this.tone({ type: 'square', from: 1319, duration: 0.09, volume: 0.18, delay: 0.06 });
  }
  heart() {
    [523, 659, 784].forEach((note, i) => {
      this.tone({ type: 'triangle', from: note, duration: 0.12, volume: 0.2, delay: i * 0.08 });
    });
  }
  power() {
    [440, 587, 740, 880].forEach((note, i) => {
      this.tone({ type: 'square', from: note, duration: 0.1, volume: 0.16, delay: i * 0.05 });
    });
  }
  hurt() {
    this.tone({ type: 'sawtooth', from: 300, to: 80, duration: 0.3, volume: 0.28 });
    this.noise({ duration: 0.18, volume: 0.2, from: 800, to: 100 });
  }
  gameOver() {
    [392, 330, 262, 196].forEach((note, i) => {
      this.tone({ type: 'triangle', from: note, duration: 0.28, volume: 0.24, delay: i * 0.18 });
    });
  }
  bossAppear() {
    this.tone({ type: 'sawtooth', from: 110, to: 220, duration: 0.6, volume: 0.26 });
    this.noise({ duration: 0.5, volume: 0.2, from: 400, to: 80 });
  }
  bossShot() { this.tone({ type: 'square', from: 260, to: 120, duration: 0.16, volume: 0.16 }); }
  explosion() {
    this.noise({ duration: 0.8, volume: 0.4, from: 2200, to: 60 });
    this.tone({ type: 'sawtooth', from: 160, to: 40, duration: 0.7, volume: 0.24 });
  }
  select() { this.tone({ type: 'square', from: 660, duration: 0.06, volume: 0.2 }); }
  confirm() {
    this.tone({ type: 'square', from: 660, duration: 0.08, volume: 0.2 });
    this.tone({ type: 'square', from: 990, duration: 0.12, volume: 0.2, delay: 0.08 });
  }
  laugh() {
    [0, 1, 2, 3].forEach((i) => {
      this.tone({ type: 'square', from: 180, to: 120, duration: 0.16, volume: 0.26, delay: i * 0.22 });
    });
  }
  rocket() { this.noise({ duration: 1.6, volume: 0.28, from: 900, to: 120 }); }
  victory() {
    [523, 659, 784, 1047].forEach((note, i) => {
      this.tone({ type: 'square', from: note, duration: 0.26, volume: 0.24, delay: i * 0.16 });
    });
  }

  /** Sparse bass pulse under the action; each level gets its own scale. */
  startMusic(theme = 'earth') {
    this.stopMusic();
    if (!this.ctx) return;
    const notes = theme === 'moon' ? [98, 123, 147, 123] : [110, 138, 165, 138];
    this.musicStep = 0;
    this.musicTimer = setInterval(() => {
      if (this.muted || !this.ctx) return;
      const note = notes[this.musicStep % notes.length];
      this.musicStep++;
      const start = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.5, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.34);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(start);
      osc.stop(start + 0.4);
    }, 420);
  }

  stopMusic() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
  }
}
