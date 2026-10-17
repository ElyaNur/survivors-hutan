import { test } from 'node:test'; import assert from 'node:assert/strict';
import { createFx } from '../src/game/fx.js';
import TUNING from '../src/data/tuning.js';

test('burst caps particles, dropping the oldest', () => {
  const fx = createFx();
  for (let i = 0; i < 1000; i++) fx.burst(0, 0, '#fff', 10, 50);
  assert.ok(fx.counts().particles <= TUNING.fx.maxParticles);
  assert.ok(fx.counts().particles > 0);
});
test('number caps at maxNumbers', () => {
  const fx = createFx();
  for (let i = 0; i < 400; i++) fx.number(0, 0, i, '#fff');
  assert.ok(fx.counts().numbers <= TUNING.fx.maxNumbers);
});
test('particles and numbers expire', () => {
  const fx = createFx();
  fx.burst(0, 0, '#fff', 10, 50); fx.number(0, 0, 5, '#fff');
  fx.update(2);
  assert.deepEqual(fx.counts(), { particles: 0, numbers: 0, anims: 0 });
});
test('strongest shake wins, then decays to zero', () => {
  const fx = createFx();
  fx.shake(2, 0.1); fx.shake(4, 0.4);
  let max = 0;
  for (let i = 0; i < 50; i++) { fx.update(0.001); max = Math.max(max, Math.abs(fx.offset().x), Math.abs(fx.offset().y)); }
  assert.ok(max > 2 && max <= 4, `max ${max}`);
  fx.update(0.5);
  assert.deepEqual({ ...fx.offset() }, { x: 0, y: 0 });
});
test('weaker shake does not override a stronger active one', () => {
  const fx = createFx();
  fx.shake(4, 0.4); fx.shake(2, 0.1);
  let max = 0;
  for (let i = 0; i < 100; i++) { fx.update(0.001); max = Math.max(max, Math.abs(fx.offset().x), Math.abs(fx.offset().y)); }
  assert.ok(max > 2, `max ${max}`);
});
test('hitstop freezes then releases', () => {
  const fx = createFx();
  assert.equal(fx.frozen(), false);
  fx.hitstop(0.05); assert.equal(fx.frozen(), true);
  fx.update(0.06); assert.equal(fx.frozen(), false);
});
const stubCtx = calls => new Proxy({ canvas: { width: 480, height: 270 } }, {
  get: (t, k) => k in t ? t[k] : (k === 'fillRect' ? () => { calls.rect++; } : () => {}),
  set: (t, k, v) => { calls.set.push(k); t[k] = v; return true; },
});
const stubAssets = (calls, totals = {}) => ({
  has: () => true, size: () => ({ w: 5, h: 7 }), animTotal: n => totals[n] ?? 0,
  draw: (c, name, x, y, o) => calls.draw.push([name, x, y, o.t]),
});
test('draw renders particles, bitmap-font numbers, anims and flash, without touching text state', () => {
  const calls = { rect: 0, draw: [], set: [] };
  const fx = createFx();
  fx.burst(100, 100, '#f00', 3, 40); fx.number(100, 100, 7, 'y'); fx.anim(120, 90, 'fx_poof', { dur: 0.4 }); fx.flashScreen('#f00', 0.2);
  fx.update(0.1);
  fx.draw(stubCtx(calls), { x: 50, y: 50, w: 480, h: 270 }, stubAssets(calls));
  assert.ok(calls.rect >= 4);
  const glyphs = calls.draw.filter(d => d[0].startsWith('glyph_'));
  assert.deepEqual(glyphs.map(g => g[0]), ['glyph_55_y']);
  const poof = calls.draw.find(d => d[0] === 'fx_poof');
  assert.equal(poof[1], 70); assert.equal(poof[2], 40); assert.ok(Math.abs(poof[3] - 100) < 1e-6);
  assert.ok(!calls.set.some(k => k === 'textAlign' || k === 'textBaseline' || k === 'font'), 'leaked ' + calls.set);
});
test('anim lifetime defaults to assets.animTotal; an explicit dur wins; no assets falls back', () => {
  const life = (fx, opts) => { fx.anim(0, 0, 'fx_poof', opts); let t = 0; while (fx.counts().anims && t < 5) { fx.update(0.01); t += 0.01; } return t; };
  const near = (a, b) => assert.ok(Math.abs(a - b) < 0.03, `${a} vs ${b}`);
  const calls = { draw: [] };
  near(life(createFx(stubAssets(calls, { fx_poof: 355 }))), 0.355);
  near(life(createFx(stubAssets(calls, { fx_poof: 355 })), { dur: 0.1 }), 0.1);
  near(life(createFx()), 0.4);
  near(life(createFx(stubAssets(calls, {}))), 0.4);           // a plain frame (total 0) also falls back
});
