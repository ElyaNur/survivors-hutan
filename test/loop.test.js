import { test } from 'node:test'; import assert from 'node:assert/strict';
import { stepClock } from '../src/engine/loop.js';
test('accumulates whole steps', () => {
  assert.deepEqual(stepClock(0, 1/30), { steps: 2, acc: 0 });
  const r = stepClock(0, 1/120); assert.equal(r.steps, 0); assert.ok(Math.abs(r.acc - 1/120) < 1e-9);
});
test('clamps long frames (tab return) to maxFrame', () => {
  assert.equal(stepClock(0, 5).steps, 6);   // 0.1s / (1/60) = 6
});
import { startLoop } from '../src/engine/loop.js';
test('setPaused(false) while running does not drop frame time', () => {
  let now = 0, cb, updates = 0;
  globalThis.requestAnimationFrame = f => { cb = f; };
  performance.now = () => now;
  const loop = startLoop(() => updates++, () => {});
  now = 1000 / 60; cb(now); assert.equal(updates, 1);
  now = 20; loop.setPaused(false);              // e.g. key auto-repeat while running
  now = 2000 / 60; cb(now); assert.equal(updates, 2);
});
