import { startLoop } from './engine/loop.js';
import { input, initInput } from './engine/input.js';
import { loadSheets } from './engine/assets.js';
import { createRun, updateRun, drawRun, chooseCard } from './game/run.js';
import { CLASSES } from './data/classes.js';
import { drawHud, updateBanner } from './ui/hud.js';
import { levelUpScreen, starterPickScreen } from './ui/screens.js';
import { drawText } from './engine/font.js';

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

const assets = await loadSheets(['mage', 'enemies', 'fx', 'world', 'ui']);
const CLASS = 'mage';                                   // ponytail: fixed until class select (Task 13)
// Flow: starter pick -> playing <-> levelup. Until the pick, a throwaway run is the frozen backdrop.
let run = createRun(CLASS, CLASSES[CLASS].skills[0], 0, assets), started = false;
let screen = starterPickScreen(CLASSES[CLASS], assets);
let loop, held = false;
initInput(canvas, () => { if (!document.hidden) loop.setPaused(false); });
loop = startLoop(
  dt => {
    if (!started) {
      const id = screen.update(input);
      if (id) { run = createRun(CLASS, id, Date.now(), assets); started = true; screen = null; window.run = run; }   // TEMP-DEBUG: console hook
    } else if (run.state === 'won' || run.state === 'lost') {   // ponytail: minimal result until Task 13's screen
      if (input.pressed('Enter')) { run = createRun(CLASS, CLASSES[CLASS].skills[0], 0, assets); started = false; screen = starterPickScreen(CLASSES[CLASS], assets); }
    } else if (screen) {
      const card = screen.update(input);
      if (card) { chooseCard(run, card); screen = null; }   // still levelup -> a fresh screen for the next pending level
    } else { held = run.fx.frozen(); updateRun(run, dt, input); updateBanner(run, dt); }
    if (started && !screen && run.state === 'levelup') screen = levelUpScreen(run, assets);
    if (!held) input.endFrame();                          // per sim step: a tap is never cleared before a step reads it (nor during hitstop)
    held = false;
  },
  () => { drawRun(ctx, run, assets); if (started) drawHud(ctx, run, assets); if (screen) screen.draw(ctx); else drawResult(); });

function drawResult() {
  if (run.state !== 'won' && run.state !== 'lost') return;
  const won = run.state === 'won';
  ctx.globalAlpha = 0.5; ctx.fillStyle = '#1d1a2f'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  drawText(ctx, assets, won ? 'MENANG!' : 'KALAH', W / 2, H / 2 - 60, { color: won ? 'y' : 'r', align: 'center', scale: 4 });   // above the mage, who stays in view
  drawText(ctx, assets, 'Tekan Enter untuk main lagi', W / 2, H / 2 - 30, { align: 'center' });
}

const pause = () => loop.setPaused(true);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
addEventListener('blur', pause);
