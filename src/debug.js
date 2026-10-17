// ?debug only: test shortcuts. main.js imports this module only when the URL has ?debug.
// F1 +60 s  F2 +1 pending level  F3 every owned skill to Lv5  F4 FPS / enemy / particle overlay
// F6 400 slimes around the mage  F7 invincibility  F8 jump to 19:50
import { drawText } from './engine/font.js';
import { newlyUnlocked } from './logic/progression.js';

const SLIMES = 400, JUMP_TO = 19 * 60 + 50;

export function install(game) {
  let overlayOn = false, fps = 0, frames = 0, since = performance.now();

  const actions = {
    F1: () => { game.run.time += 60; },
    F2: () => { game.run.pendingLevelUps++; },
    F3: () => {
      const { run } = game;
      for (const id in run.build.skills) run.build.skills[id] = 5;
      // same as the real path (chooseCard): unlock the ults this makes possible, and queue their banners
      for (const u of newlyUnlocked(run.build, run.classDef)) { run.build.ults.push(u); run.newUlts.push(u); }
    },
    F4: () => { overlayOn = !overlayOn; },
    F6: () => {
      const { run } = game, p = run.player;
      for (let i = 0; i < SLIMES; i++) {
        const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 160;
        game.spawnEnemy(run, 'slime', p.x + Math.cos(a) * d, p.y + Math.sin(a) * d);
      }
    },
    F7: () => { game.run.godMode = !game.run.godMode; },   // per run: a new run starts mortal again
    F8: () => { game.run.time = JUMP_TO; },
  };

  addEventListener('keydown', e => {
    if (!/^F[1-8]$/.test(e.code)) return;
    e.preventDefault();                                     // no help page, no reload
    if (!e.repeat) actions[e.code]?.();
  });

  game.overlays.push(ctx => {
    const now = performance.now();
    frames++;
    if (now - since >= 500) { fps = Math.round(frames * 1000 / (now - since)); frames = 0; since = now; }
    if (!overlayOn) return;
    const { run } = game, c = run.fx.counts();
    drawText(ctx, game.assets, `FPS ${fps}  EN ${run.enemies.length}  PT ${c.particles}`, 4, 20, { color: 'c' });
  });
}
