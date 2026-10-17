import { startLoop } from './engine/loop.js';
import { input, initInput } from './engine/input.js';
import { loadSheets } from './engine/assets.js';
import { createRun, updateRun, drawRun } from './game/run.js';

const W = 480, H = 270;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// Integer scale when the window fits, otherwise the largest fractional scale >= 0.5.
function resize() {
  const fit = Math.min(innerWidth / W, innerHeight / H);
  const scale = fit >= 1 ? Math.floor(fit) : Math.max(fit, 0.5);
  canvas.style.width = W * scale + 'px';
  canvas.style.height = H * scale + 'px';
}
addEventListener('resize', resize);
resize();

const assets = await loadSheets(['mage', 'enemies', 'fx']);
const run = createRun('mage', 'fireball', Date.now());
let loop;
initInput(canvas, () => { if (!document.hidden) loop.setPaused(false); });
loop = startLoop(
  dt => { updateRun(run, dt, input); input.endFrame(); },
  () => drawRun(ctx, run, assets));

const pause = () => loop.setPaused(true);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
addEventListener('blur', pause);
