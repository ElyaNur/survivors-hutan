import { test } from 'node:test'; import assert from 'node:assert/strict';
import { SpatialGrid } from '../src/logic/grid.js';
test('query returns nearby entities only; clear empties', () => {
  const g = new SpatialGrid(), a = { x: 10, y: 10 }, b = { x: 40, y: 10 }, c = { x: 300, y: 300 };
  [a, b, c].forEach(e => g.insert(e));
  const r = g.query(12, 12, 40);
  assert.ok(r.includes(a) && r.includes(b) && !r.includes(c));
  g.clear();
  assert.deepEqual(g.query(12, 12, 40), []);
});
