// ?debug only: test shortcuts. main.js imports this module only when the URL has ?debug.
// F1 +60 s  F2 +1 pending level  F3 every owned skill to Lv5  F4 FPS / enemy / particle overlay  F5 grant the next fusion
// F6 400 slimes around the mage  F7 invincibility  F8 jump to 19:50  F9 forget all discoveries
import { drawText } from './engine/font.js';

const SLIMES = 400, JUMP_TO = 19 * 60 + 50;

export function install(game) {
  let overlayOn = false, fps = 0, frames = 0, since = performance.now();

  const actions = {
    F1: () => { game.run.time += 60; },
    F2: () => { game.run.pendingLevelUps++; },
    F3: () => { for (const id in game.run.build.skills) game.run.build.skills[id] = 5; },
    F4: () => { overlayOn = !overlayOn; },
    F5: () => {                                             // next fusion not owned: ingredients stay, banner queued, nothing persists
      const { run } = game, f = run.classDef.fusions.find(f => !run.build.fusions.includes(f.id));
      if (!f) return;
      run.build.fusions.push(f.id);
      run.newFusions.push({ id: f.id, first: !run.discovered.has(f.id) });
    },
    F6: () => {
      const { run } = game, p = run.player;
      for (let i = 0; i < SLIMES; i++) {
        const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 160;
        game.spawnEnemy(run, 'slime', p.x + Math.cos(a) * d, p.y + Math.sin(a) * d);
      }
    },
    F7: () => { game.run.godMode = !game.run.godMode; },   // per run: a new run starts mortal again
    F8: () => { game.run.time = JUMP_TO; },
    F9: () => game.clearDiscoveries(),
  };

  addEventListener('keydown', e => {
    if (!/^F[1-9]$/.test(e.code)) return;
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
