// Original 138 BPM trance score and pop sound effects, synthesized entirely with Web Audio.
// Optional MP3 replacements are local files configured in assets/audio-config.json.
export const MUSIC_BPM = 138;
const STEP = 60 / MUSIC_BPM / 4;
const PHRASE = 128; // 8 bars of 16ths
const AUDIO_FETCH_TIMEOUT = 30_000;
async function audioRequest(url, consume) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), AUDIO_FETCH_TIMEOUT);
  try { const response = await fetch(url, { signal: controller.signal }); if (!response.ok) throw new Error('Audio resource unavailable'); return await consume(response); } finally { clearTimeout(timer); }
}
export const EFFECT_NAMES = Object.freeze(['shot', 'kill', 'xp', 'hurt', 'dash', 'pulse', 'arc', 'nova', 'heal', 'boss', 'bossDown', 'level', 'choose', 'evolve', 'won', 'start', 'dead', 'combo', 'bossShot', 'ui', 'heartbeat']);
export function parseAudioConfig(data, configURL) {
  const result = { music: null, effects: Object.create(null) };
  if (!data || typeof data !== 'object' || Array.isArray(data)) return result;
  const base = new URL('../', configURL);
  function local(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    try { const url = new URL(value, configURL); return url.origin === base.origin && url.pathname.startsWith(base.pathname) && !url.username && !url.password ? url.href : null; } catch { return null; }
  }
  result.music = local(data.music);
  for (const name of EFFECT_NAMES) { const url = local(data.effects?.[name]); if (url) result.effects[name] = url; }
  return result;
}
export const midi = m => 440 * 2 ** ((m - 69) / 12);

// --- composition -------------------------------------------------------------------------------
// Uplifting minor-key loop (Am F C G) and a harmonic-minor boss loop (Am F Dm E), two bars per chord.
export const PROGRESSIONS = Object.freeze({
  main: [{ chord: [57, 60, 64], bass: 45 }, { chord: [57, 60, 65], bass: 41 }, { chord: [55, 60, 64], bass: 48 }, { chord: [55, 59, 62], bass: 43 }],
  boss: [{ chord: [57, 60, 64], bass: 45 }, { chord: [57, 60, 65], bass: 41 }, { chord: [57, 62, 65], bass: 50 }, { chord: [56, 59, 64], bass: 40 }]
});
// Eighth-note lead per 8-bar phrase (0 = rest).
const LEAD = [
  76, 0, 81, 0, 84, 0, 83, 81, 76, 0, 81, 0, 84, 86, 84, 0,
  77, 0, 81, 0, 84, 0, 83, 81, 77, 0, 81, 0, 84, 88, 86, 84,
  79, 0, 84, 0, 88, 0, 86, 84, 79, 0, 84, 0, 86, 0, 84, 83,
  79, 0, 83, 0, 86, 0, 84, 83, 81, 83, 84, 86, 88, 0, 91, 0
];
const BOSS_LEAD = [
  81, 84, 88, 84, 81, 84, 89, 88, 81, 84, 88, 84, 93, 91, 89, 88,
  81, 84, 89, 84, 81, 84, 89, 91, 93, 89, 84, 81, 89, 88, 86, 84,
  86, 89, 93, 89, 86, 89, 94, 93, 86, 89, 93, 89, 98, 96, 94, 93,
  88, 92, 95, 92, 88, 92, 95, 96, 98, 96, 95, 92, 88, 86, 84, 83
];
const ARP = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 4, 3, 2, 1];
const GATE = [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1];
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31, 33, 36];

// Arrangement for a phrase. kind: intro | groove | break | drop | boss
export function arrangement(kind, intensity, bar) {
  const a = { kick: true, bass: true, hats: true, open: false, clap: false, arp: true, gate: false, lead: false, sub: false, ride: false, pad: false, roll: false, riser: false, cutoff: 1, energy: .4 };
  if (kind === 'intro') return { ...a, bass: bar >= 2, hats: bar >= 4, pad: true, cutoff: .45 + bar * .05, energy: .3 };
  if (kind === 'break') {
    if (bar < 4) return { ...a, kick: false, bass: false, hats: false, pad: true, lead: true, cutoff: .35, energy: .25 };
    return { ...a, kick: bar >= 6, bass: false, hats: bar >= 5, pad: true, lead: bar >= 6, gate: true, roll: true, riser: true, cutoff: .35 + (bar - 4) * .17, energy: .45 + (bar - 4) * .12 };
  }
  if (kind === 'boss') return { ...a, open: true, clap: true, gate: true, lead: true, sub: true, ride: true, roll: bar === 7, energy: 1 };
  const level = kind === 'drop' ? Math.max(3, intensity) : intensity;
  return { ...a, open: level >= 1, clap: true, gate: level >= 1, lead: level >= 2, sub: level >= 3, ride: level >= 3 && bar % 2 === 1, roll: bar === 7 && level >= 2, cutoff: level >= 2 ? 1 : .6 + level * .2, energy: [.45, .6, .78, .92, 1][Math.min(4, level)] };
}

export class AudioEngine {
  constructor() {
    this.ctx = null; this.master = null; this.musicGain = null; this.sfxGain = null;
    this.enabled = false; this.active = true; this.musicDuck = 1; this.musicVolume = .4; this.sfxVolume = .6;
    this.step = 0; this.nextBeat = 0; this.scheduler = null; this.voices = 0; this.musicVoices = 0;
    this.nodes = new Set(); this.musicNodes = new Set(); this.endingNodes = new Set(); this.lastEffects = new Map();
    this.musicBuffer = null; this.effectBuffers = Object.create(null); this.playingMusic = null;
    this.musicOffset = 0; this.musicStartedAt = 0; this.assetsReady = null; this.assetErrors = [];
    this.scene = 'home'; this.intensity = 0; this.bossActive = false;
    this.phraseStep = 0; this.phrase = 0; this.phraseKind = 'intro'; this.current = arrangement('intro', 0, 0); this.xpChain = 0; this.lastXP = 0;
  }
  connect(context) {
    this.ctx = context; const c = context;
    this.master = c.createGain(); this.master.gain.value = .8;
    this.musicGain = c.createGain(); this.sfxGain = c.createGain(); this.musicGain.gain.value = 0; this.sfxGain.gain.value = 0;
    this.musicBus = c.createBiquadFilter(); this.musicBus.type = 'lowpass'; this.musicBus.frequency.value = 18000; this.musicBus.Q.value = .7; this.musicBus.connect(this.musicGain);
    this.pumpGain = c.createGain(); this.pumpGain.connect(this.musicBus);
    this.drumGain = c.createGain(); this.drumGain.connect(this.musicBus);
    this.musicGain.connect(this.master); this.sfxGain.connect(this.master);
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 6; comp.attack.value = .004; comp.release.value = .16;
    const clip = c.createWaveShaper(), curve = new Float32Array(2048); for (let i = 0; i < curve.length; i++) { const x = i / 1023.5 - 1; curve[i] = Math.tanh(x * 1.15) / Math.tanh(1.15) * .97; } clip.curve = curve;
    this.master.connect(comp); comp.connect(clip); clip.connect(c.destination);
    this.analyser = c.createAnalyser(); this.analyser.fftSize = 256; clip.connect(this.analyser); this.levels = new Uint8Array(this.analyser.frequencyBinCount);
    // Dotted-eighth delay and a generated stereo hall reverb.
    this.delayIn = c.createGain(); this.delayIn.gain.value = .32; const delay = c.createDelay(1), fb = c.createGain(), hp = c.createBiquadFilter();
    delay.delayTime.value = STEP * 3; fb.gain.value = .38; hp.type = 'highpass'; hp.frequency.value = 600;
    this.delayIn.connect(delay); delay.connect(hp); hp.connect(fb); fb.connect(delay); hp.connect(this.pumpGain);
    this.reverbIn = c.createGain(); this.reverbIn.gain.value = .3; const verb = c.createConvolver(); verb.buffer = this.impulse(2.6); this.reverbIn.connect(verb); verb.connect(this.pumpGain);
    this.sfxVerb = c.createGain(); this.sfxVerb.gain.value = .22; this.sfxVerb.connect(verb);
    this.noiseBuffer = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const data = this.noiseBuffer.getChannelData(0); let seed = 81391;
    for (let i = 0; i < data.length; i++) { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; data[i] = (seed >>> 0) / 2147483648 - 1; }
    this.nextBeat = c.currentTime; this.applyVolumes();
  }
  impulse(seconds) {
    const rate = this.ctx.sampleRate, len = Math.floor(rate * seconds), buf = this.ctx.createBuffer(2, len, rate); let seed = 1234567;
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; d[i] = ((seed >>> 0) / 2147483648 - 1) * Math.pow(1 - i / len, 3.2) * (i < rate * .01 ? i / (rate * .01) : 1); } }
    return buf;
  }
  async unlock() {
    try {
      if (!this.ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return; this.connect(new C()); this.scheduler = setInterval(() => this.schedule(), 25); this.assetsReady = this.loadAssets(); }
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      this.applyVolumes(); this.syncPlayback();
    } catch { this.enabled = false; this.applyVolumes(); }
  }
  async loadAssets() {
    const configURL = new URL('../assets/audio-config.json', import.meta.url);
    try {
      const config = parseAudioConfig(await audioRequest(configURL, r => r.json()), configURL), decoded = new Map();
      const load = url => { if (!decoded.has(url)) decoded.set(url, (async () => { try { return await this.ctx.decodeAudioData(await audioRequest(url, r => r.arrayBuffer())); } catch { this.assetErrors.push(url); return null; } })()); return decoded.get(url); };
      await Promise.all([config.music ? (async () => { const b = await load(config.music); if (b) { this.musicBuffer = b; this.syncPlayback(); } })() : null, ...Object.entries(config.effects).map(async ([n, u]) => { const b = await load(u); if (b) this.effectBuffers[n] = b; })]);
      this.syncPlayback();
    } catch { this.assetErrors.push(configURL.href); }
  }
  applyVolumes() {
    if (!this.ctx) return; const t = this.ctx.currentTime, on = this.enabled && this.active;
    this.musicGain.gain.setTargetAtTime(on ? this.musicVolume * this.musicDuck : 0, t, .05);
    this.sfxGain.gain.setTargetAtTime(on ? this.sfxVolume : 0, t, .02);
  }
  setScene(scene) {
    if (scene !== 'ending') for (const s of this.endingNodes) { try { s.stop(); } catch { } }
    const previous = this.scene; this.scene = scene; this.musicDuck = scene === 'ending' ? .22 : 1;
    if ((scene === 'play' || scene === 'home') && previous !== scene) { this.intensity = 0; this.bossActive = false; this.pendingBoss = false; this.phrase = 0; this.startPhrase(scene === 'play' ? 'groove' : 'intro'); }
    this.applyVolumes();
  }
  setIntensity(level, boss = false) { this.intensity = Math.max(0, Math.min(3, level | 0)); if (boss && !this.bossActive) { this.bossActive = true; this.pendingBoss = true; } else if (!boss) this.bossActive = false; }
  // Pause and level-up menus muffle the music instead of stopping it.
  setMuffle(on) {
    on = !!on; if (on === this.muffled) return; this.muffled = on; if (!this.ctx) return;
    const t = this.ctx.currentTime; this.musicBus.frequency.cancelScheduledValues(t); this.musicBus.frequency.setTargetAtTime(on ? 650 : 18000, t, on ? .08 : .2);
  }
  setEnabled(value) { this.enabled = !!value; if (value) void this.unlock(); this.applyVolumes(); this.syncPlayback(); }
  setActive(value) { this.active = !!value; this.applyVolumes(); this.syncPlayback(); if (value && this.ctx) this.nextBeat = this.ctx.currentTime; }
  syncPlayback() {
    if (!this.ctx) return;
    if (this.enabled && this.active && this.musicBuffer) {
      if (this.playingMusic) return; const s = this.ctx.createBufferSource(); s.buffer = this.musicBuffer; s.loop = true; s.connect(this.musicGain);
      this.playingMusic = s; this.musicStartedAt = this.ctx.currentTime; s.onended = () => s.disconnect(); s.start(0, this.musicOffset % s.buffer.duration);
    } else if (this.playingMusic) { this.musicOffset = (this.musicOffset + this.ctx.currentTime - this.musicStartedAt) % this.musicBuffer.duration; const s = this.playingMusic; this.playingMusic = null; s.stop(); }
  }
  // Beat clock for visuals; null when the synth is not running.
  beatInfo() {
    if (!this.ctx || !this.enabled || !this.active || this.musicBuffer || this.ctx.state !== 'running') return null;
    const pos = Math.max(0, this.step - (this.nextBeat - this.ctx.currentTime) / STEP), beat = pos / 4;
    return { count: Math.floor(beat), phase: beat % 1, bar: Math.floor(beat / 4), energy: this.current.energy };
  }
  level() { if (!this.analyser) return 0; this.analyser.getByteFrequencyData(this.levels); let s = 0; for (let i = 0; i < 24; i++) s += this.levels[i]; return s / (24 * 255); }
  // --- voices -----------------------------------------------------------------------------------
  reserve(dest) { const music = dest !== this.sfxGain && dest !== this.sfxVerb; return this.ctx && (music ? this.musicVoices < 110 : this.voices - this.musicVoices < 48); }
  track(source, dest, nodes, ending = false) {
    const music = dest !== this.sfxGain; this.voices++; if (music) { this.musicVoices++; this.musicNodes.add(source); } this.nodes.add(source); if (ending) this.endingNodes.add(source);
    source.onended = () => { this.voices--; if (music) { this.musicVoices--; this.musicNodes.delete(source); } this.nodes.delete(source); this.endingNodes.delete(source); for (const n of nodes) n.disconnect(); };
  }
  note(freq, time, duration = .2, type = 'sine', gain = .12, dest = this.pumpGain, o = {}) {
    if (!this.reserve(dest)) return;
    const c = this.ctx, osc = c.createOscillator(), env = c.createGain(), filter = c.createBiquadFilter(), nodes = [osc, filter, env];
    osc.type = type; osc.frequency.setValueAtTime(freq, time); if (o.detune) osc.detune.value = o.detune;
    if (o.end) osc.frequency.exponentialRampToValueAtTime(o.end, time + (o.glide || duration));
    filter.type = o.filter || 'lowpass'; filter.Q.value = o.q || .8; filter.frequency.setValueAtTime(o.cutoff || 8000, time);
    if (o.cutoffEnd) filter.frequency.exponentialRampToValueAtTime(o.cutoffEnd, time + (o.sweep || duration));
    const attack = o.attack || .003, release = o.release ?? duration;
    env.gain.setValueAtTime(0, time); env.gain.linearRampToValueAtTime(gain, time + attack);
    if (o.hold) env.gain.setValueAtTime(gain, time + o.hold);
    env.gain.exponentialRampToValueAtTime(.0001, time + Math.max(attack + .01, release));
    osc.connect(filter); filter.connect(env);
    let out = env; if (o.pan && c.createStereoPanner) { const pan = c.createStereoPanner(); pan.pan.value = o.pan; env.connect(pan); out = pan; nodes.push(pan); }
    out.connect(dest); if (o.echo) out.connect(this.delayIn); if (o.verb) out.connect(dest === this.sfxGain ? this.sfxVerb : this.reverbIn);
    this.track(osc, dest, nodes, o.ending); osc.start(time); osc.stop(time + Math.max(attack + .01, release) + .02);
  }
  noise(time, duration, gain, dest = this.drumGain, frequency = 6500, kind = 'highpass', o = {}) {
    if (!this.reserve(dest)) return;
    const c = this.ctx, src = c.createBufferSource(), env = c.createGain(), filter = c.createBiquadFilter(); src.buffer = this.noiseBuffer; src.loop = duration > .9;
    src.playbackRate.value = o.rate || 1;
    filter.type = kind; filter.frequency.setValueAtTime(frequency, time); filter.Q.value = o.q || .7; if (o.end) filter.frequency.exponentialRampToValueAtTime(o.end, time + duration);
    env.gain.setValueAtTime(0, time);
    if (o.swell) { env.gain.linearRampToValueAtTime(gain, time + duration * .96); env.gain.linearRampToValueAtTime(.0001, time + duration); }
    else { env.gain.linearRampToValueAtTime(gain, time + (o.attack || .001)); env.gain.exponentialRampToValueAtTime(.0001, time + duration); }
    src.connect(filter); filter.connect(env); env.connect(dest); if (o.verb) env.connect(dest === this.sfxGain ? this.sfxVerb : this.reverbIn);
    this.track(src, dest, [src, filter, env], o.ending); src.start(time, Math.random() * .5); src.stop(time + duration + .02);
  }
  // Several detuned saws for a supersaw voice.
  saw(freq, time, duration, gain, dest, o = {}) {
    const spread = o.spread || [-14, 0, 14];
    spread.forEach((d, i) => this.note(freq, time, duration, 'sawtooth', gain / Math.sqrt(spread.length), dest, { ...o, detune: d, pan: spread.length > 1 ? (i / (spread.length - 1) - .5) * (o.width ?? .8) : 0 }));
  }
  // --- music ------------------------------------------------------------------------------------
  startPhrase(kind) { this.phraseKind = kind; this.phraseStep = 0; }
  nextPhraseKind() {
    if (this.bossActive && this.scene !== 'home') return 'boss';
    this.phrase++;
    const cycle = this.phrase % 4; return cycle === 2 ? 'break' : cycle === 3 ? 'drop' : 'groove';
  }
  kick(time, gain = .95) {
    this.note(150, time, .3, 'sine', gain * .85, this.drumGain, { end: 40, glide: .09 });
    this.note(2400, time, .012, 'square', .12, this.drumGain, { end: 300, cutoff: 5000 });
    this.pumpGain.gain.cancelScheduledValues(time); this.pumpGain.gain.setValueAtTime(.22, time); this.pumpGain.gain.linearRampToValueAtTime(1, time + STEP * 3.2);
  }
  clap(time, gain = .3) { for (let i = 0; i < 3; i++) this.noise(time + i * .011, i === 2 ? .2 : .03, gain * (i === 2 ? 1 : .6), this.drumGain, 1300, 'bandpass', { q: 1.1, verb: i === 2 }); }
  musicStep(step, time) {
    if (this.phraseStep >= PHRASE) { this.startPhrase(this.nextPhraseKind()); this.crash(time); }
    if (this.pendingBoss && this.phraseStep % 16 === 0) { this.pendingBoss = false; this.startPhrase('boss'); this.crash(time, true); }
    if (!this.bossActive && this.phraseKind === 'boss' && this.phraseStep % 64 === 0 && this.phraseStep > 0) { this.startPhrase('drop'); this.crash(time); }
    const ps = this.phraseStep++, bar = Math.floor(ps / 16), beat = ps % 16, kind = this.phraseKind;
    const a = arrangement(kind, this.scene === 'home' ? 0 : this.intensity, bar); this.current = a;
    const prog = PROGRESSIONS[kind === 'boss' ? 'boss' : 'main'], chord = prog[Math.floor(bar / 2) % 4];
    const cutoff = 400 + 9000 * a.cutoff * a.cutoff;
    if (beat === 0 && !this.muffled) this.musicBus.frequency.setTargetAtTime(kind === 'break' && bar < 4 ? 2400 : 18000, time, .3);
    // Drums
    if (a.kick && beat % 4 === 0) this.kick(time);
    if (a.clap && (beat === 4 || beat === 12)) this.clap(time);
    if (a.hats) { const accent = beat % 4 === 2; this.noise(time, accent ? .05 : .025, accent ? .11 : .06, this.drumGain, 8500); }
    if (a.open && beat % 4 === 2) this.noise(time, .16, .1, this.drumGain, 7000);
    if (a.ride && beat % 2 === 0) this.noise(time, .3, .028, this.drumGain, 11000);
    if (a.roll) {
      const final = bar === 7 || kind === 'break', density = kind === 'break' ? (bar < 6 ? 4 : bar < 7 ? 2 : 1) : (beat >= 8 ? 1 : 2);
      if (final && ps % density === 0) this.noise(time, .09, .05 + (kind === 'break' ? (bar - 4) * .035 + beat * .002 : beat * .006), this.drumGain, 1700, 'bandpass', { q: .9, verb: true });
    }
    if (a.riser && bar === 4 && beat === 0) { const d = STEP * 64; this.noise(time, d, .1, this.musicBus, 400, 'bandpass', { end: 9000, swell: true, q: 1.4 }); this.note(110, time, d, 'sawtooth', .025, this.musicBus, { end: 880, glide: d, attack: d * .9, cutoff: 3000 }); }
    // Rolling trance bass: the three 16ths after every kick.
    if (a.bass && beat % 4 !== 0) this.note(midi(chord.bass), time, STEP * .9, 'sawtooth', .07, this.pumpGain, { cutoff: Math.min(1800, cutoff * .25 + 240), cutoffEnd: 150, q: 2.2, release: STEP * .95 });
    if (a.sub && beat % 4 !== 0) this.note(midi(chord.bass - 12), time, STEP * .9, 'sine', .09, this.pumpGain, { release: STEP * .9 });
    // Gated supersaw chords: one sustained voice per bar shaped by a 16th-note gate.
    if (a.gate && beat === 0) this.gateChord(chord.chord, time, cutoff, kind === 'boss' ? .5 : .44);
    if (a.pad && beat === 0 && bar % 2 === 0) for (const n of chord.chord) this.saw(midi(n), time, STEP * 32, .075, this.pumpGain, { attack: .6, cutoff: 2200, spread: [-9, 9], verb: true, release: STEP * 32 });
    if (a.arp) { const tones = [...chord.chord, chord.chord[0] + 12, chord.chord[1] + 12], n = tones[ARP[beat]] + 12; this.note(midi(n), time, STEP * 1.6, 'square', .16 * (a.energy + .4), this.pumpGain, { cutoff: Math.min(9000, cutoff * .8 + 900), cutoffEnd: 700, q: 4, echo: true, pan: (beat % 2 ? .35 : -.35) }); }
    if (a.lead && beat % 2 === 0) {
      const seq = kind === 'boss' ? BOSS_LEAD : LEAD, n = seq[(Math.floor(ps / 2)) % 64];
      if (n) this.saw(midi(n), time, STEP * (kind === 'boss' ? 1.8 : 3), kind === 'break' && bar < 4 ? .16 : .2, this.pumpGain, { width: 1, spread: [-16, -6, 6, 16], attack: .008, cutoff: kind === 'break' && bar < 4 ? 2200 : 6500, echo: true, verb: true, release: STEP * (kind === 'boss' ? 1.8 : 3.2) });
    }
    if (kind === 'boss' && beat === 0 && bar % 4 === 0) this.siren(time);
  }
  gateChord(notes, time, cutoff, gain) {
    if (!this.reserve(this.pumpGain)) return;
    const c = this.ctx, gate = c.createGain(), filter = c.createBiquadFilter(), bar = STEP * 16, nodes = [gate, filter];
    gain /= notes.length; // nine oscillators share one gate
    filter.type = 'lowpass'; filter.frequency.value = Math.min(9000, cutoff); filter.Q.value = 1.2; gate.gain.setValueAtTime(0, time);
    for (let i = 0; i < 16; i++) { const t = time + i * STEP; if (GATE[i]) { gate.gain.setValueAtTime(0, t); gate.gain.linearRampToValueAtTime(gain, t + .004); gate.gain.setValueAtTime(gain, t + STEP * .55); gate.gain.linearRampToValueAtTime(0, t + STEP * .85); } }
    filter.connect(gate); gate.connect(this.pumpGain); gate.connect(this.reverbIn);
    let first = null;
    for (const n of notes) for (const d of [-12, 0, 12]) {
      const osc = c.createOscillator(), pan = c.createStereoPanner ? c.createStereoPanner() : null; osc.type = 'sawtooth'; osc.frequency.value = midi(n + 12); osc.detune.value = d + (Math.random() - .5) * 4;
      if (pan) { pan.pan.value = d / 14; osc.connect(pan); pan.connect(filter); nodes.push(pan); } else osc.connect(filter);
      osc.start(time); osc.stop(time + bar + .02); nodes.push(osc); if (!first) first = osc;
    }
    this.track(first, this.pumpGain, nodes);
    gate.gain.setValueAtTime(0, time + bar);
  }
  crash(time, big = false) {
    this.noise(time, big ? 2.2 : 1.6, big ? .14 : .1, this.drumGain, 5000, 'highpass', { verb: true });
    if (big) { this.note(90, time, 1.4, 'sine', .5, this.drumGain, { end: 28 }); this.noise(time, .6, .2, this.drumGain, 900, 'lowpass'); }
  }
  siren(time) { for (let i = 0; i < 4; i++) this.note(i % 2 ? 740 : 988, time + i * STEP * 4, STEP * 4, 'square', .022, this.musicBus, { cutoff: 2600, attack: .02, echo: true }); }
  schedule() {
    if (!this.ctx) return; const now = this.ctx.currentTime;
    if (!this.enabled || !this.active || this.musicBuffer) { this.nextBeat = now; return; }
    if (this.nextBeat < now - .2) this.nextBeat = now;
    while (this.nextBeat < now + .14) { this.musicStep(this.step, this.nextBeat); this.nextBeat += STEP; this.step++; }
  }
  // --- effects ----------------------------------------------------------------------------------
  effect(type, o = {}) {
    if (!this.ctx || !this.enabled || !this.active || !EFFECT_NAMES.includes(type)) return;
    const t = this.ctx.currentTime, spacing = { shot: .075, kill: .045, xp: .05, arc: .09, nova: .1, bossShot: .3, ui: .04, heartbeat: .5 }[type] || .04;
    if (t - (this.lastEffects.get(type) ?? -Infinity) < spacing) return; this.lastEffects.set(type, t);
    const dest = this.sfxGain, buffer = this.effectBuffers[type], ending = type === 'won' || type === 'dead';
    if (buffer) { if (!this.reserve(dest)) return; const s = this.ctx.createBufferSource(); s.buffer = buffer; s.connect(dest); this.track(s, dest, [s], ending); s.start(t); return; }
    const tone = (f, d, w, v, end, x = {}) => this.note(f, t + (x.at || 0), d, w, v, dest, { end, ending, ...x });
    const noise = (d, v, f = 3200, kind = 'bandpass', x = {}) => this.noise(t + (x.at || 0), d, v, dest, f, kind, { ending, ...x });
    const chord = (notes, gap, d, w, v, x = {}) => notes.forEach((n, i) => tone(midi(n), d, w, v, null, { ...x, at: (x.at || 0) + i * gap }));
    switch (type) {
      case 'shot': tone(1320, .06, 'square', .04, 520, { cutoff: 4200 }); break;
      case 'kill': { const step = PENTA[Math.min(PENTA.length - 1, Math.floor((o.combo || 0) / 6))]; tone(midi(72 + step), .09, 'square', .07, null, { cutoff: 5000 }); tone(midi(84 + step), .07, 'sine', .06); noise(.05, .08, 2600); break; }
      case 'xp': { if (t - this.lastXP > .5) this.xpChain = 0; this.lastXP = t; const n = 79 + PENTA[Math.min(12, this.xpChain++)]; tone(midi(n), .08, 'triangle', .1, null); tone(midi(n + 12), .06, 'sine', .05, null, { at: .025 }); break; }
      case 'hurt': tone(220, .25, 'sawtooth', .2, 55, { cutoff: 1600 }); noise(.18, .2, 900, 'lowpass'); tone(80, .2, 'sine', .3, 40); break;
      case 'dash': noise(.22, .2, 500, 'bandpass', { end: 6000, q: 2 }); tone(300, .18, 'triangle', .12, 1400); break;
      case 'pulse': tone(160, .7, 'sine', .55, 30); noise(.5, .25, 3000, 'lowpass', { end: 200, verb: true }); chord([72, 76, 79, 84], .03, .35, 'square', .05, { cutoff: 4000 }); break;
      case 'arc': noise(.12, .16, 4000, 'bandpass', { q: 6, end: 9000 }); tone(1800, .1, 'sawtooth', .06, 400, { cutoff: 6000 }); break;
      case 'nova': tone(110, .5, 'sine', .45, 30); noise(.4, .3, 2400, 'lowpass', { end: 150, verb: true }); tone(600, .15, 'square', .05, 90, { cutoff: 3000 }); break;
      case 'boss': for (let i = 0; i < 6; i++) tone(i % 2 ? 660 : 880, .2, 'square', .06, null, { at: i * .22, cutoff: 3000 }); tone(55, 1.4, 'sawtooth', .18, 40, { cutoff: 500 }); noise(1.2, .1, 300, 'lowpass'); break;
      case 'bossShot': tone(500, .2, 'square', .035, 250, { cutoff: 2000 }); break;
      case 'heal': chord([84, 88, 91, 96], .05, .3, 'triangle', .09, { verb: true }); break;
      case 'bossDown': tone(70, 1.2, 'sine', .55, 25); noise(1, .3, 3000, 'lowpass', { end: 120, verb: true }); chord([69, 72, 76, 81, 84, 88], .06, .7, 'sawtooth', .045, { cutoff: 5000, verb: true }); break;
      case 'level': chord([72, 76, 79, 84, 88, 91], .045, .25, 'square', .055, { cutoff: 5000 }); noise(.4, .08, 1000, 'bandpass', { end: 9000, q: 2 }); break;
      case 'choose': chord([84, 91], .04, .2, 'triangle', .1, { verb: true }); noise(.08, .05, 7000, 'highpass'); break;
      case 'ui': tone(1600, .04, 'sine', .05, 2000); break;
      case 'heartbeat': tone(70, .16, 'sine', .45, 45); tone(66, .14, 'sine', .32, 42, { at: .2 }); break;
      case 'combo': { const n = Math.min(4, o.tier || 0); chord([72 + n * 2, 76 + n * 2, 79 + n * 2, 84 + n * 2], .035, .32, 'sawtooth', .04, { cutoff: 6000, verb: true }); noise(.3, .06, 2000, 'bandpass', { end: 10000, q: 1.5 }); break; }
      case 'evolve': noise(.6, .12, 400, 'bandpass', { end: 10000, swell: true, q: 2 }); chord([69, 73, 76, 81, 85, 88, 93], .05, .9, 'sawtooth', .04, { at: .55, cutoff: 6000, verb: true }); tone(60, .8, 'sine', .4, 30, { at: .55 }); break;
      case 'start': tone(90, .6, 'sine', .45, 35); noise(.5, .14, 6000, 'highpass', { verb: true }); chord([69, 76, 81], .0, .5, 'sawtooth', .05, { cutoff: 5000, verb: true }); break;
      case 'won': tone(70, .8, 'sine', .4, 30); noise(1.2, .12, 6000, 'highpass', { verb: true });[[69, 72, 76], [65, 69, 72], [67, 71, 74], [69, 73, 76, 81]].forEach((c, i) => c.forEach(n => this.saw(midi(n + 12), t + i * .32, i === 3 ? 1.8 : .32, .06, dest, { ending: true, cutoff: 6000, verb: true, spread: [-12, 12] }))); chord([81, 84, 88, 93], .08, .4, 'square', .04, { at: 1.0 }); break;
      case 'dead': tone(440, 1.1, 'sawtooth', .12, 40, { cutoff: 2000, cutoffEnd: 200 }); tone(110, 1, 'sine', .3, 30); chord([64, 60, 57], .22, .6, 'triangle', .1, { at: .15, verb: true }); noise(.4, .1, 800, 'lowpass'); break;
    }
  }
}
