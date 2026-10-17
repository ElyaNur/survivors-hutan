import { test } from 'node:test'; import assert from 'node:assert/strict';
import { stepClock } from '../src/engine/loop.js';
test('accumulates whole steps', () => {
  assert.deepEqual(stepClock(0, 1/30), { steps: 2, acc: 0 });
  const r = stepClock(0, 1/120); assert.equal(r.steps, 0); assert.ok(Math.abs(r.acc - 1/120) < 1e-9);
});
test('clamps long frames (tab return) to maxFrame', () => {
  assert.equal(stepClock(0, 5).steps, 6);   // 0.1s / (1/60) = 6
});
