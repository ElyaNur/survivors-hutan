import { test } from 'node:test'; import assert from 'node:assert/strict';
import { shouldPlay, createThrottle, createMuteStore, sfx, MUTE_KEY } from '../src/engine/audio.js';

const throwing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
const memory = (init = {}) => { const m = { ...init }; return { getItem: k => m[k] ?? null, setItem: (k, v) => { m[k] = String(v); }, m }; };

test('shouldPlay throttles each name to one play per 40 ms', () => {
  assert.equal(shouldPlay('hit', 0), true);
  assert.equal(shouldPlay('hit', 0.02), false);
  assert.equal(shouldPlay('hit', 0.05), true);
  assert.equal(shouldPlay('die', 0.02), true);              // another name is its own bucket
});

test('shouldPlay keeps at most 12 concurrent voices', () => {
  const th = createThrottle(), names = ['fireball', 'meteor', 'ice', 'nova', 'zap', 'orb', 'hit', 'die', 'pickup', 'levelup', 'ult', 'hurt', 'bossRoar'];
  for (const n of names.slice(0, 12)) assert.equal(shouldPlay(n, 0, th), true, n);
  assert.equal(shouldPlay(names[12], 0, th), false);        // all 12 still sounding
  assert.equal(shouldPlay(names[12], 5, th), true);         // long after they ended
});

test('a refused play does not restart the throttle window', () => {
  const th = createThrottle();
  assert.equal(shouldPlay('hit', 0, th), true);
  assert.equal(shouldPlay('hit', 0.03, th), false);
  assert.equal(shouldPlay('hit', 0.041, th), true);
});

test('mute: default false, key under survivorsHutan.muted, round-trips', () => {
  assert.equal(MUTE_KEY, 'survivorsHutan.muted');
  const s = memory(), a = createMuteStore(s);
  assert.equal(a.isMuted(), false);
  a.setMuted(true);
  assert.equal(s.m[MUTE_KEY], '1');
  assert.equal(createMuteStore(s).isMuted(), true);         // a fresh load (reload) remembers
  a.setMuted(false);
  assert.equal(createMuteStore(s).isMuted(), false);
});

test('mute with throwing or missing storage: false by default, setMuted does not throw', () => {
  for (const st of [throwing, null]) {
    const m = createMuteStore(st);
    assert.equal(m.isMuted(), false);
    assert.doesNotThrow(() => m.setMuted(true));
    assert.equal(m.isMuted(), true);                        // still honoured for this session
  }
});

test('sfx before any user gesture is a silent no-op', () => assert.doesNotThrow(() => sfx('hit')));
