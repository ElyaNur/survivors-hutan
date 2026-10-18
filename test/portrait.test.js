import { test, after } from 'node:test'; import assert from 'node:assert/strict';
import { setPortrait } from '../src/engine/view.js';
import { pauseRect, pauseHit, fusionPairs, bossBarRect } from '../src/ui/hud.js';
import { createRun } from '../src/game/run.js';
import { CLASSES, NAMES } from '../src/data/classes.js';
import { textWidth } from '../src/engine/font.js';
const mage = CLASSES.mage;
after(() => setPortrait(false));

test('pause button is right-anchored: same spot in landscape, top-right in portrait', () => {
  assert.deepEqual(pauseRect(), { x: 458, y: 20, w: 18, h: 18 });
  setPortrait(true);
  assert.deepEqual(pauseRect(), { x: 248, y: 20, w: 18, h: 18 });
  assert.ok(pauseHit({ x: 252, y: 24 }) && !pauseHit({ x: 200, y: 24 }));
  setPortrait(false);
});

test('fusionPairs: closest first, at most 3, lit only at 5+5', () => {
  const run = createRun('mage', 'fireball', 1);
  run.build.skills = { fireball: 5, meteor: 5, iceShard: 3, frostNova: 2 };   // 4 skills: several fusable pairs
  const pairs = fusionPairs(run);
  assert.ok(pairs.length <= 3 && pairs.length > 0);
  assert.equal(pairs[0].lit, true);
  for (let i = 1; i < pairs.length; i++) assert.ok(!pairs[i].lit);
});
test('boss bar rect: landscape as today; portrait inside the view, clear of the pause button and timer row', () => {
  assert.deepEqual(bossBarRect(), { x: 140, y: 32, w: 200, h: 8 });
  setPortrait(true);
  const b = bossBarRect(), p = pauseRect();
  assert.ok(b.x >= 0 && b.x + b.w <= 270 && b.y > p.y + p.h - 2 && b.y > 26);
  setPortrait(false);
});
test('banner fits portrait: every fusion title fits at the portrait banner scale', () => {
  for (const f of mage.fusions) assert.ok(textWidth(`FUSION BARU: ${NAMES[f.id].name}!`, 1) <= 270 - 2 * 24 - 20, f.id);
});
