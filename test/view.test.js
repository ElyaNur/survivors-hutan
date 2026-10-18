import { test, after } from 'node:test'; import assert from 'node:assert/strict';
import { VIEW, setPortrait } from '../src/engine/view.js';
import { camera, WORLD_W, WORLD_H } from '../src/game/world.js';
after(() => setPortrait(false));

test('view defaults to landscape 480x270', () => {
  assert.deepEqual(VIEW, { w: 480, h: 270, portrait: false });
});
test('landscape camera unchanged', () => {
  assert.deepEqual(camera({ x: 960, y: 540 }), { x: 720, y: 405, w: 480, h: 270 });
  assert.deepEqual(camera({ x: 0, y: 0 }), { x: 0, y: 0, w: 480, h: 270 });
});
test('portrait camera: 270x480, centred, clamped to the world', () => {
  setPortrait(true);
  assert.deepEqual(VIEW, { w: 270, h: 480, portrait: true });
  assert.deepEqual(camera({ x: 960, y: 540 }), { x: 825, y: 300, w: 270, h: 480 });
  assert.deepEqual(camera({ x: WORLD_W, y: WORLD_H }), { x: WORLD_W - 270, y: WORLD_H - 480, w: 270, h: 480 });
  setPortrait(false);
  assert.equal(camera({ x: 960, y: 540 }).w, 480);
});
