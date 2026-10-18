import { test } from 'node:test'; import assert from 'node:assert/strict';
import { stickVector } from '../src/engine/input.js';

const len = v => Math.hypot(v.x, v.y);

test('stick: zero inside the deadzone, full at the radius, capped past it', () => {
  assert.deepEqual(stickVector(0, 0, 24, 0.15), { x: 0, y: 0 });
  assert.deepEqual(stickVector(3, 0, 24, 0.15), { x: 0, y: 0 });     // 3 < 0.15 * 24
  assert.ok(len(stickVector(4, 0, 24, 0.15)) > 0);
  assert.equal(len(stickVector(24, 0, 24, 0.15)), 1);
  assert.ok(Math.abs(len(stickVector(100, -100, 24, 0.15)) - 1) < 1e-9);
});

test('stick: ramps up between deadzone and radius, keeps the drag direction', () => {
  const half = stickVector(0, -(0.15 + 0.85 / 2) * 24, 24, 0.15);   // halfway through the live band
  assert.ok(Math.abs(half.y + 0.5) < 1e-9); assert.equal(half.x, 0);
  const v = stickVector(-30, 40, 24, 0.15);
  assert.ok(Math.abs(v.x / v.y + 0.75) < 1e-9);
});
