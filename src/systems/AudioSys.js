// Áudio 100% sintetizado via WebAudio — zero assets, com pan estéreo,
// variação de pitch (sem sons robóticos repetidos) e suspend na pausa.
export class AudioSys {
  constructor() {
    this.ctx = null; this.master = null; this.muted = false;
    this.rainNode = null; this.rainGain = null; this.cityGain = null;
    this.stepT = 0; this.hornT = 0; this.whooshT = 0;
  }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.7;
      this.master.connect(this.ctx.destination);
      this.startCityAmbience();
    } catch { this.ctx = null; }
  }
  suspend() { try { this.ctx?.suspend(); } catch {} }
  resume() { try { if (this.ctx?.state === 'suspended' && !this.muted) this.ctx.resume(); } catch {} }
  setVolume(v) { if (this.master) this.master.gain.value = (v / 100) * 0.9; }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.7; }
  ok() { return !!this.ctx && !this.muted && this.ctx.state === 'running'; }
  vary(base, amt = 0.06) { return base * (1 + (Math.random() * 2 - 1) * amt); }
  out(pan = 0) {
    // cadeia de saída com pan; retorna nó para conectar a fonte
    if (this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      p.connect(this.master);
      return p;
    }
    return this.master;
  }
  tone(freq, dur, type = 'sine', vol = 0.2, slideTo = null, delay = 0, pan = 0) {
    if (!this.ok()) return;
    try {
      const t = this.ctx.currentTime + delay;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(Math.max(1, freq), t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.out(pan));
      o.start(t); o.stop(t + dur + 0.05);
    } catch {}
  }
  noise(dur, vol = 0.15, filterFreq = 1200, type = 'bandpass', delay = 0, pan = 0) {
    if (!this.ok()) return;
    try {
      const t = this.ctx.currentTime + delay;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = filterFreq;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(this.out(pan));
      src.start(t);
    } catch {}
  }
  ui() { this.tone(this.vary(660, 0.03), 0.08, 'triangle', 0.12); }
  coin(pan = 0) {
    this.tone(this.vary(988, 0.02), 0.09, 'square', 0.09, null, 0, pan);
    this.tone(this.vary(1319, 0.02), 0.16, 'square', 0.09, null, 0.08, pan);
  }
  bigSale() { [523, 659, 784, 1047].forEach((f, i) => this.tone(this.vary(f, 0.015), 0.16, 'triangle', 0.13, null, i * 0.09)); }
  vip() { [784, 988, 1175, 1568, 2093].forEach((f, i) => this.tone(f, 0.2, 'sine', 0.11, null, i * 0.07)); }
  comboLost() { [392, 330, 262].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.1, null, i * 0.1)); }
  countTick(last = false) { this.tone(last ? 880 : 660, last ? 0.2 : 0.09, 'square', 0.08); }
  refuse() { this.tone(this.vary(220, 0.05), 0.18, 'sawtooth', 0.07, 160); }
  horn(pan = 0, vol = 1) {
    const now = performance.now() / 1000;
    if (now - this.hornT < 1.2) return; // cooldown: sem buzinaço repetido
    this.hornT = now;
    this.tone(this.vary(370, 0.03), 0.35, 'sawtooth', 0.09 * vol, 350, 0, pan);
    this.tone(this.vary(466, 0.03), 0.35, 'sawtooth', 0.07 * vol, 440, 0, pan);
  }
  whoosh(pan = 0, vol = 1) {
    const now = performance.now() / 1000;
    if (now - this.whooshT < 1.5) return;
    this.whooshT = now;
    this.noise(0.4, 0.11 * vol, 800, 'lowpass', 0, pan);
  }
  brake(pan = 0) { this.noise(0.35, 0.05, 2600, 'highpass', 0, pan); }
  crash() { this.noise(0.5, 0.32, 300, 'lowpass'); this.tone(90, 0.4, 'sawtooth', 0.18, 40); }
  step() { this.noise(0.06, 0.03, 500 + Math.random() * 400, 'bandpass'); }
  beep(ped = false) { this.tone(ped ? 880 : 440, 0.12, 'square', 0.06); }
  lightChange(toRed) { toRed ? (this.tone(523, .12, 'square', .09), this.tone(523, .12, 'square', .09, null, .18)) : this.tone(784, .2, 'square', .09); }
  stepMove(dt, moving, running) { this.stepT -= dt; if (moving && this.stepT <= 0) { this.step(); this.stepT = running ? 0.27 : 0.36; } }
  startCityAmbience() {
    try {
      const len = this.ctx.sampleRate * 2;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
      const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
      this.cityGain = this.ctx.createGain(); this.cityGain.gain.value = 0.05;
      src.connect(f); f.connect(this.cityGain); this.cityGain.connect(this.master);
      src.start();
    } catch {}
  }
  setRain(on) {
    if (!this.ctx) return;
    try {
      if (on && !this.rainNode) {
        const len = this.ctx.sampleRate * 2;
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
        const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3000;
        this.rainGain = this.ctx.createGain(); this.rainGain.gain.value = 0.0;
        this.rainGain.gain.linearRampToValueAtTime(0.06, this.ctx.currentTime + 2);
        src.connect(f); f.connect(this.rainGain); this.rainGain.connect(this.master);
        src.start(); this.rainNode = src;
      } else if (!on && this.rainNode) {
        const n = this.rainNode, g = this.rainGain;
        g.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 1);
        setTimeout(() => { try { n.stop(); } catch {} }, 1200);
        this.rainNode = null; this.rainGain = null;
      }
    } catch {}
  }
}
