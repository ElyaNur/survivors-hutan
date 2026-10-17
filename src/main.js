import { startLoop } from './engine/loop.js';
import { input, initInput } from './engine/input.js';
import { loadSheets } from './engine/assets.js';

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
const player = { x: W / 2, y: H / 2, moving: false, flip: false };
let loop;
initInput(canvas, () => { if (!document.hidden) loop.setPaused(false); });
loop = startLoop(
  dt => {
    const v = input.moveVector();
    player.x += v.x * 60 * dt; player.y += v.y * 60 * dt;
    player.moving = v.x !== 0 || v.y !== 0;
    if (v.x) player.flip = v.x < 0;
    input.endFrame();
  },
  () => {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    assets.draw(ctx, player.moving ? 'mage_walk' : 'mage_idle', player.x, player.y, { flip: player.flip, t: performance.now() });
  });

const pause = () => loop.setPaused(true);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
addEventListener('blur', pause);
