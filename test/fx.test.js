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
test('draw renders particles, numbers, anims and flash', () => {
  const calls = { rect: 0, text: 0, anim: [], flash: 0 };
  const ctx = new Proxy({ canvas: { width: 480, height: 270 } }, {
    get: (t, k) => k in t ? t[k] : (k === 'fillRect' ? () => { calls.rect++; } : k === 'fillText' ? () => { calls.text++; } : () => {}),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  const assets = { draw: (c, name, x, y, o) => calls.anim.push([name, x, y, o.t]) };
  const fx = createFx();
  fx.burst(100, 100, '#f00', 3, 40); fx.number(100, 100, 7, '#fff'); fx.anim(120, 90, 'fx_poof'); fx.flashScreen('#f00', 0.2);
  fx.update(0.1);
  fx.draw(ctx, { x: 50, y: 50, w: 480, h: 270 }, assets);
  assert.ok(calls.rect >= 4); assert.equal(calls.text, 2); // shadow + fill
  assert.equal(calls.anim.length, 1); assert.equal(calls.anim[0][0], 'fx_poof');
  assert.equal(calls.anim[0][1], 70); assert.equal(calls.anim[0][2], 40); assert.ok(Math.abs(calls.anim[0][3] - 100) < 1e-6);
});
