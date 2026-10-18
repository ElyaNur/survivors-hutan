import { test, after } from 'node:test'; import assert from 'node:assert/strict';
import { setPortrait } from '../src/engine/view.js';
import { pauseRect, pauseHit } from '../src/ui/hud.js';
after(() => setPortrait(false));

test('pause button is right-anchored: same spot in landscape, top-right in portrait', () => {
  assert.deepEqual(pauseRect(), { x: 458, y: 20, w: 18, h: 18 });
  setPortrait(true);
  assert.deepEqual(pauseRect(), { x: 248, y: 20, w: 18, h: 18 });
  assert.ok(pauseHit({ x: 252, y: 24 }) && !pauseHit({ x: 200, y: 24 }));
  setPortrait(false);
});
