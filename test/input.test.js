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

test('stale stick: a primary touch takes over, a hidden page drops it; a second finger does not steal', async () => {
  const h = {};
  globalThis.addEventListener = (n, f) => { h[n] = f; };
  globalThis.document = { hidden: false, addEventListener: (n, f) => { h[n] = f; } };
  const { input, initInput } = await import('../src/engine/input.js');
  initInput({ getBoundingClientRect: () => ({ left: 0, top: 0, width: 270, height: 480 }), width: 270, height: 480, addEventListener() {} });
  const down = (id, isPrimary) => h.pointerdown({ pointerType: 'touch', pointerId: id, isPrimary, clientX: 10, clientY: 10, preventDefault() {} });
  down(1, true);
  down(2, false);
  assert.equal(input.stick.id, 1, 'a second finger only taps');
  down(3, true);                                             // pointerup for 1 never came
  assert.equal(input.stick.id, 3, 'a primary pointer replaces the stale stick');
  document.hidden = true; h.visibilitychange();
  assert.equal(input.stick, null);
  delete globalThis.addEventListener; delete globalThis.document;
});
