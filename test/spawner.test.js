import { test } from 'node:test'; import assert from 'node:assert/strict';
import { createRng } from '../src/logic/rng.js';
import { offscreenPoint, createSpawner, spawnerUpdate } from '../src/logic/spawner.js';
import { SCHEDULE } from '../src/data/spawns.js';

const BOUNDS = { w: 1920, h: 1080 }, M = 16;
const outsideView = (p, v) => p.x < v.x - M || p.x > v.x + v.w + M || p.y < v.y - M || p.y > v.y + v.h + M;
const inBounds = p => p.x >= 0 && p.x <= BOUNDS.w && p.y >= 0 && p.y <= BOUNDS.h;

for (const [name, view] of [['corner', { x: 0, y: 0, w: 480, h: 270 }], ['centre', { x: 720, y: 405, w: 480, h: 270 }]])
  test(`offscreenPoint: view in the ${name} -> inside bounds, outside view + margin`, () => {
    const rng = createRng(5);
    for (let i = 0; i < 2000; i++) {
      const p = offscreenPoint(view, BOUNDS, rng, M);
      assert.ok(inBounds(p), `out of bounds: ${p.x},${p.y}`);
      assert.ok(outsideView(p, view), `inside view: ${p.x},${p.y}`);
    }
  });

const VIEW = { x: 720, y: 405, w: 480, h: 270 };
// Steps the spawner from t0 for `secs` at 60 Hz, returns every spawn.
function run(sp, t0, secs, alive = 0, rng = createRng(1)) {
  const out = [];
  for (let i = 1; i <= Math.round(secs * 60); i++) out.push(...spawnerUpdate(sp, t0 + i / 60, 1 / 60, VIEW, BOUNDS, rng, alive));
  return out;
}

test('minute 0: about 1 regular spawn per second', () => {
  const n = run(createSpawner(), 0, 60).length;
  assert.ok(n >= 40 && n <= 80, `got ${n}`);
});

test('at the enemy cap there are no regular spawns', () => {
  assert.equal(run(createSpawner(), 0, 10, 400).length, 0);
});

test('a boss fires exactly once when t crosses its time', () => {
  const sp = createSpawner(), rng = createRng(2);
  run(sp, 0, 599.5, 400, rng);                               // capped: only events/bosses can appear
  const kings = run(sp, 599.5, 1, 400, rng).filter(s => s.type === 'kingSlime');
  assert.equal(kings.length, 1);
  assert.equal(run(sp, 600.5, 5, 400, rng).filter(s => s.type === 'kingSlime').length, 0);
});

test('crossing an event time yields `count` entities of the right type', () => {
  for (const ev of SCHEDULE.events) {
    const type = ev.kind === 'batRing' ? 'bat' : 'wolf';
    const sp = createSpawner(), rng = createRng(3);
    run(sp, 0, ev.at - 0.5, 400, rng);
    const got = run(sp, ev.at - 0.5, 1, 400, rng);
    assert.equal(got.filter(s => s.type === type).length, ev.count, `${ev.kind} at ${ev.at}`);
    assert.ok(got.every(inBounds));
  }
});
