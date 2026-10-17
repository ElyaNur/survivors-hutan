import { test } from 'node:test'; import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseSheet, animFrame } from '../src/engine/assets.js';
const sheet = parseSheet(JSON.parse(readFileSync(new URL('./fixtures/sample-sheet.json', import.meta.url))));
test('mage_walk has 4 frames', () => assert.equal(sheet.anims.mage_walk.frames.length, 4));
test('every anim frame exists in frames; total is sum of durations', () => {
  for (const a of Object.values(sheet.anims)) {
    for (const f of a.frames) assert.ok(sheet.frames[f], f);
    assert.equal(a.total, a.durations.reduce((s, d) => s + d, 0));
    assert.equal(a.durations.length, a.frames.length);
  }
});
test('frame rects are plain x,y,w,h', () => assert.deepEqual(sheet.frames.mage_idle_0, { x: 0, y: 0, w: 17, h: 26 }));
const a = { frames: ['a', 'b'], durations: [100, 100], total: 200 };
test('animFrame picks by time, loops, or holds last', () => {
  assert.equal(animFrame(a, 150), 'b');
  assert.equal(animFrame(a, 250), 'a');
  assert.equal(animFrame(a, 250, false), 'b');
});
