import { test } from 'node:test'; import assert from 'node:assert/strict';
import { createRng } from '../src/logic/rng.js';
test('same seed gives same sequence', () => {
  const a = createRng(7), b = createRng(7);
  const sa = Array.from({ length: 10 }, () => a.next()), sb = Array.from({ length: 10 }, () => b.next());
  assert.deepEqual(sa, sb);
  assert.ok(sa.every(v => v >= 0 && v < 1));
});
test('int stays inclusive in range', () => {
  const r = createRng(3);
  for (let i = 0; i < 1000; i++) { const v = r.int(1, 3); assert.ok(Number.isInteger(v) && v >= 1 && v <= 3); }
});
test('pick and range stay in bounds', () => {
  const r = createRng(5);
  for (let i = 0; i < 200; i++) { assert.ok(['a', 'b'].includes(r.pick(['a', 'b']))); const v = r.range(2, 4); assert.ok(v >= 2 && v < 4); }
});
