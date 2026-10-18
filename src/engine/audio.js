// Procedural sound effects (WebAudio: oscillators, one shared noise buffer, envelopes; no files) and the remembered mute flag.
// The AudioContext is born on the first key or click (autoplay rules); before that sfx() does nothing.
import TUNING from '../data/tuning.js';

const A = TUNING.audio;
export const MUTE_KEY = 'survivorsHutan.muted';            // '1' = muted

// ---- Mute: storage may be missing or throw (private mode, blocked cookies): sound on, not remembered.
export function createMuteStore(storage) {
  let muted = null;                                         // read once, then served from memory (the menu asks every frame)
  return {
    isMuted() {
      if (muted === null) { try { muted = storage?.getItem(MUTE_KEY) === '1'; } catch { muted = false; } }
      return muted;
    },
    setMuted(v) {
      muted = !!v;
      try { storage?.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* not remembered */ }
    },
  };
}
const store = createMuteStore((() => { try { return localStorage; } catch { return null; } })());
export const isMuted = store.isMuted, setMuted = store.setMuted;

// ---- Throttle. Pure of audio: callers pass the clock. Each name plays at most once per minGap, and at most
// maxVoices plays may be sounding at once (a play lasts DUR[name]). A refused play changes nothing.
export const DUR = { fireball: 0.25, meteor: 0.6, ice: 0.35, nova: 0.5, zap: 0.15, orb: 0.15, hit: 0.08, die: 0.2, pickup: 0.15,
  levelup: 0.55, ult: 1.0, hurt: 0.25, bossRoar: 1.1, chest: 0.5, click: 0.06, lubangHitam: 1.4, lubangHitamBoom: 0.9, cincinMatahari: 0.3,
  phoenix: 0.55, phoenixDive: 0.45, phoenixBoom: 0.8, gletser: 0.9, gletserSlide: 1.2, pagarKristal: 0.25, pagarKristalZap: 0.2,
  kometEs: 0.8, kometEsBurst: 0.4, supernova: 1.0, bolaPlasma: 0.7, bolaPlasmaZap: 0.15, bolaPlasmaPop: 0.8, penghakimanLangitCall: 0.9,
  penghakimanLangit: 0.5, pusaranKristal: 0.12 };
export const createThrottle = () => ({ last: {}, ends: [] });
const shared = createThrottle();
export function shouldPlay(name, now, th = shared) {
  if (name in th.last && now - th.last[name] < A.minGap) return false;
  const ends = th.ends;
  for (let i = ends.length - 1; i >= 0; i--) if (ends[i] <= now) { ends[i] = ends[ends.length - 1]; ends.pop(); }
  if (ends.length >= A.maxVoices) return false;
  th.last[name] = now; ends.push(now + (DUR[name] ?? 0.2));
  return true;
}

// ---- Voices
let ctx = null, master = null, noiseBuf = null, detune = 0;

function unlock() {
  if (ctx) { if (ctx.state !== 'running') ctx.resume?.(); return; }   // a first key that wasn't a real gesture leaves it suspended: retry on every later one
  try {
    ctx = new AudioContext();
    master = ctx.createGain(); master.gain.value = A.master;
    const lim = ctx.createDynamicsCompressor();                      // limiter-ish: stacked voices squash instead of clipping
    lim.threshold.value = -10; lim.knee.value = 6; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.25;
    master.connect(lim); lim.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);   // one second of white noise, shared by every voice
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    ctx.resume?.();
  } catch { ctx = null; }
}
if (typeof addEventListener === 'function') {
  for (const ev of ['keydown', 'pointerdown']) addEventListener(ev, unlock, { capture: true });
}

// Gain node shaped click-free: 5 ms attack, exponential decay to silence at t + dur.
function env(t, vol, dur, attack = 0.005) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(master);
  return g;
}
// Oscillator gliding f0 -> f1 over dur. out: the node it feeds (default: its own envelope into the master).
function tone(t, type, f0, f1, dur, vol, attack, out) {
  const o = ctx.createOscillator();
  o.type = type; o.detune.value = detune;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  o.connect(out ?? env(t, vol, dur, attack));
  o.start(t); o.stop(t + dur + 0.02);
  return o;
}
// Filtered noise, cutoff gliding f0 -> f1.
function noise(t, dur, vol, kind, f0, f1, q = 1, attack) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter();
  s.buffer = noiseBuf; s.loop = true; s.playbackRate.value = 1 + detune / 1200;
  f.type = kind; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  s.connect(f); f.connect(env(t, vol, dur, attack));
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}
// A lowpassed bus for a voice that needs a filter on oscillators (growl, chord): returns the node to feed.
function bus(t, vol, dur, attack, f0, f1) {
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  f.connect(env(t, vol, dur, attack));
  return f;
}

const VOICES = {
  fireball(t) { noise(t, 0.25, 0.5, 'bandpass', 500, 2200, 1.5, 0.04); tone(t, 'triangle', 320, 110, 0.2, 0.14); },   // rising whoosh + low flutter
  meteor(t) {                                                                                                           // deep boom: falling sine thump + rumbling noise
    tone(t, 'sine', 95, 32, 0.6, 0.9); noise(t, 0.55, 0.6, 'lowpass', 700, 70);
  },
  ice(t) { tone(t, 'sine', 1760, 1760, 0.35, 0.22); tone(t, 'sine', 2637, 2637, 0.22, 0.14); tone(t, 'triangle', 3520, 3520, 0.08, 0.06); },   // glassy bell ping: fifth apart partials
  nova(t) {                                                                                                             // shimmer: two rising sweeps a hair apart beat against each other
    tone(t, 'triangle', 500, 2400, 0.5, 0.16, 0.06); tone(t, 'triangle', 508, 2450, 0.5, 0.16, 0.06); noise(t, 0.4, 0.1, 'highpass', 3000, 6000, 1, 0.08);
  },
  zap(t) {                                                                                                              // crackle: three tiny highpassed noise bursts + a falling square buzz
    for (let i = 0; i < 3; i++) noise(t + i * 0.035, 0.035, 0.4, 'highpass', 2500, 2500);
    tone(t, 'square', 900, 180, 0.12, 0.08);
  },
  orb(t) { tone(t, 'sine', 220, 200, 0.15, 0.25, 0.02); tone(t, 'triangle', 1300, 1000, 0.035, 0.1); },                // soft hum with a tick on top
  hit(t) { noise(t, 0.05, 0.25, 'bandpass', 1300, 800, 1); tone(t, 'square', 190, 90, 0.06, 0.07); },                  // short thwack
  die(t) { tone(t, 'triangle', 330, 55, 0.18, 0.28); noise(t, 0.14, 0.2, 'lowpass', 1800, 200); },                     // descending pop with a puff
  pickup(t) { tone(t, 'square', 880, 880, 0.05, 0.08); tone(t + 0.055, 'square', 1320, 1320, 0.09, 0.08); },           // two-note blip, up a fifth
  levelup(t) { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(t + i * 0.09, 'square', f, f, 0.2, 0.12)); },   // C major arpeggio
  ult(t) {                                                                                                              // big rising chord: three saws a fourth up, lowpass opening, a noise swell under
    const b = bus(t, 0.35, 1.0, 0.25, 300, 3500);
    for (const f of [110, 138.6, 165]) tone(t, 'sawtooth', f, f * 1.5, 1.0, 0, 0, b);
    noise(t, 0.9, 0.25, 'bandpass', 300, 2500, 0.8, 0.3);
  },
  hurt(t) { const b = bus(t, 0.35, 0.25, 0.005, 900, 200); tone(t, 'sawtooth', 210, 65, 0.25, 0, 0, b); },             // dull falling buzz
  bossRoar(t) {                                                                                                         // low growl: 55-80 Hz saw wobbled by a 9 Hz LFO, muffled, with rumble
    const b = bus(t, 0.6, 1.1, 0.15, 400, 150), o = tone(t, 'sawtooth', 80, 50, 1.1, 0, 0, b);
    const lfo = ctx.createOscillator(), depth = ctx.createGain();
    lfo.frequency.value = 9; depth.gain.value = 12;
    lfo.connect(depth); depth.connect(o.frequency);
    lfo.start(t); lfo.stop(t + 1.12);
    noise(t, 1.0, 0.3, 'lowpass', 250, 80, 1, 0.15);
  },
  chest(t) { [660, 880, 1320].forEach((f, i) => tone(t + i * 0.08, 'triangle', f, f, 0.25, 0.16)); noise(t, 0.05, 0.12, 'highpass', 3000, 3000); },   // creak-click + rising sparkle
  click(t) { tone(t, 'square', 640, 420, 0.04, 0.08); },                                                               // tiny UI tick
  lubangHitam(t) {                                                                                                      // the hole opens: a sub drone sinking, air rushing in (noise swelling as its pitch falls)
    tone(t, 'sine', 70, 34, 1.4, 0.7, 0.3); tone(t, 'triangle', 140, 52, 1.2, 0.12, 0.4);
    noise(t, 1.3, 0.35, 'bandpass', 2400, 220, 2, 0.9);
  },
  lubangHitamBoom(t) {                                                                                                  // collapse: a sharp suck-in, then a deep thump, rumble and a falling arcane shimmer
    noise(t, 0.08, 0.4, 'highpass', 1200, 5000, 1, 0.07);
    tone(t + 0.07, 'sine', 150, 28, 0.8, 1.0); noise(t + 0.07, 0.75, 0.6, 'lowpass', 1500, 60);
    tone(t + 0.07, 'triangle', 1400, 300, 0.5, 0.12); tone(t + 0.07, 'triangle', 1414, 306, 0.5, 0.1);
  },
  phoenix(t) {                                                                                                          // the firebird's cry: a screech up, then a long fall, over a crackle of flame
    tone(t, 'sawtooth', 700, 1900, 0.12, 0.06, 0.01); tone(t + 0.1, 'triangle', 1900, 620, 0.42, 0.14, 0.01);
    tone(t + 0.1, 'triangle', 1930, 640, 0.42, 0.08, 0.01); noise(t, 0.5, 0.18, 'bandpass', 1500, 600, 1.2, 0.05);
  },
  phoenixDive(t) { noise(t, 0.45, 0.4, 'bandpass', 3500, 500, 2, 0.15); tone(t, 'triangle', 1600, 2400, 0.3, 0.07, 0.1); },   // folding in: a falling whoosh, a rising whistle
  phoenixBoom(t) {                                                                                                      // fire and ice blast: deep thump and roar, a frosty shimmer on top
    tone(t, 'sine', 110, 34, 0.7, 0.9); noise(t, 0.6, 0.55, 'lowpass', 1800, 90);
    tone(t + 0.02, 'triangle', 2600, 3400, 0.4, 0.07, 0.03); noise(t, 0.35, 0.12, 'highpass', 4000, 7000, 1, 0.03);
  },
  gletser(t) {                                                                                                          // the block lands: a crack of ice, a heavy thud, a glassy ring dying away
    noise(t, 0.06, 0.45, 'highpass', 2500, 2500); tone(t, 'sine', 85, 30, 0.8, 1.0); noise(t + 0.02, 0.5, 0.4, 'lowpass', 900, 80);
    tone(t + 0.03, 'sine', 1320, 1300, 0.5, 0.1); tone(t + 0.03, 'sine', 1980, 1960, 0.35, 0.06);
  },
  gletserSlide(t) { const b = bus(t, 0.35, 1.2, 0.08, 700, 250); tone(t, 'sawtooth', 58, 48, 1.2, 0, 0, b); noise(t, 1.1, 0.3, 'bandpass', 900, 500, 1.5, 0.08); },   // grinding over the ground
  pagarKristal(t) { tone(t, 'sine', 2400, 2350, 0.18, 0.18); tone(t, 'sine', 3600, 3550, 0.1, 0.08); tone(t, 'square', 120, 110, 0.2, 0.04); },   // a crystal stabs in: tink with a buzz under it
  pagarKristalZap(t) { noise(t, 0.04, 0.3, 'bandpass', 3200, 3200, 3); noise(t + 0.06, 0.04, 0.25, 'bandpass', 2600, 2600, 3); tone(t, 'square', 60, 60, 0.18, 0.06); },   // the fence bites: two snaps over a mains hum
  kometEs(t) {                                                                                                          // impact: a deep boom and a glass crash, frost hissing out
    tone(t, 'sine', 100, 30, 0.7, 0.9); noise(t, 0.12, 0.5, 'highpass', 3000, 1500); noise(t + 0.05, 0.7, 0.2, 'highpass', 5000, 3000, 1, 0.1);
    tone(t, 'triangle', 1760, 1700, 0.5, 0.1);
  },
  kometEsBurst(t) { [2637, 3136, 2349, 3520].forEach((f, i) => tone(t + i * 0.04, 'sine', f, f * 0.98, 0.2, 0.12)); noise(t, 0.1, 0.25, 'highpass', 4000, 4000); },   // the head shatters: tinkling shards
  supernova(t) {                                                                                                        // a star going off: a sharp white crack, a deep boom, a roaring flame wave rushing out, an icy ring over it
    noise(t, 0.05, 0.5, 'highpass', 3000, 3000); tone(t, 'sine', 120, 30, 0.9, 1.0);
    noise(t + 0.03, 0.9, 0.45, 'bandpass', 300, 2600, 0.9, 0.12); tone(t + 0.02, 'triangle', 1980, 1960, 0.6, 0.08); tone(t + 0.02, 'triangle', 2005, 1985, 0.6, 0.06);
  },
  bolaPlasma(t) {                                                                                                       // the ball is born: a rising electric hum with a buzzing edge
    const b = bus(t, 0.3, 0.7, 0.1, 400, 2400); tone(t, 'sawtooth', 90, 180, 0.7, 0, 0, b); tone(t, 'sawtooth', 92, 184, 0.7, 0, 0, b);
    noise(t, 0.4, 0.12, 'bandpass', 2500, 4000, 2, 0.1);
  },
  bolaPlasmaZap(t) { noise(t, 0.03, 0.3, 'highpass', 3500, 3500); noise(t + 0.04, 0.03, 0.22, 'highpass', 2800, 2800); tone(t, 'square', 600, 150, 0.1, 0.06); },   // a lash of lightning: two snaps, a falling buzz
  bolaPlasmaPop(t) {                                                                                                    // it pops: a thump and fire roar, with a crackle of lightning scattering off
    tone(t, 'sine', 130, 35, 0.7, 0.9); noise(t, 0.6, 0.5, 'lowpass', 2000, 100);
    for (let i = 0; i < 4; i++) noise(t + 0.04 + i * 0.05, 0.03, 0.3, 'highpass', 3000 - i * 300, 3000 - i * 300);
  },
  penghakimanLangitCall(t) { tone(t, 'sine', 55, 45, 0.9, 0.5, 0.3); noise(t, 0.85, 0.3, 'lowpass', 200, 600, 1, 0.35); },   // the sky gathers: a low rolling rumble swelling
  penghakimanLangit(t) {                                                                                                // a pillar slams down: a split-second rip of thunder, a heavy crack, a rumble after
    noise(t, 0.04, 0.6, 'highpass', 2000, 2000); tone(t, 'square', 1200, 80, 0.12, 0.1);
    tone(t + 0.02, 'sine', 90, 35, 0.45, 0.7); noise(t + 0.02, 0.45, 0.4, 'lowpass', 1200, 90);
  },
  pusaranKristal(t) { tone(t, 'sine', 3136, 2800, 0.08, 0.06); noise(t, 0.04, 0.08, 'highpass', 5000, 5000); },   // a shard flung off: a soft glassy flick
  cincinMatahari(t) { noise(t, 0.2, 0.3, 'bandpass', 900, 3500, 2, 0.02); tone(t, 'triangle', 660, 1100, 0.18, 0.12); tone(t, 'sine', 330, 330, 0.25, 0.1); },   // solar flare: bright upward whoosh with a rising chirp
};

export function sfx(name) {
  if (!ctx || store.isMuted() || !VOICES[name]) return;
  const t = ctx.currentTime;
  if (!shouldPlay(name, t)) return;
  detune = (Math.random() * 2 - 1) * A.detuneCents;
  VOICES[name](t + 0.005);
}
