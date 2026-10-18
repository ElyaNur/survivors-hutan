import { startLoop } from './engine/loop.js';
import { input, initInput } from './engine/input.js';
import { loadSheets } from './engine/assets.js';
import { createRun, updateRun, drawRun, chooseCard } from './game/run.js';
import { spawnEnemy } from './game/enemies.js';
import { HUT, isWater } from './game/world.js';
import { CLASSES } from './data/classes.js';
import { drawHud, updateBanner } from './ui/hud.js';
import { levelUpScreen, starterPickScreen, menuScreen, classSelectScreen, recordsScreen, bookScreen, pauseScreen, resultScreen } from './ui/screens.js';
import { sfx, isMuted, setMuted } from './engine/audio.js';
import { loadRecords, saveRecords, mergeResult, recordFusion, discoveredSet } from './logic/records.js';

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

// Storage may be missing or throw (private mode, blocked cookies): no records, no remembered mute, still playable.
const storage = (() => { try { return localStorage; } catch { return null; } })();
const toggleMute = () => setMuted(!isMuted());           // audio.js owns the remembered flag
let records = loadRecords(storage);

// Backdrop for the menus and the starter pick: the clearing by the hut, the mage idle, a few slimes wandering.
const WANDER = { x0: 740, x1: 1180, y0: 470, y1: 700, speed: 14 };
const backdrop = createRun('mage', CLASSES.mage.skills[0], 0, assets);
for (let i = 0; i < 6; i++) spawnEnemy(backdrop, 'slime', 0, 0).wait = 0;
function wander(run, dt) {
  const rng = run.rng;
  run.time += dt;
  for (const e of run.enemies) {
    if (e.wait > 0) { e.wait -= dt; continue; }
    if (e.tx === undefined || Math.hypot(e.tx - e.x, e.ty - e.y) < 2) {
      if (e.tx !== undefined) e.wait = 0.5 + rng.next() * 2;   // sit a moment, then pick a new spot
      do { e.tx = WANDER.x0 + rng.next() * (WANDER.x1 - WANDER.x0); e.ty = WANDER.y0 + rng.next() * (WANDER.y1 - WANDER.y0); }
      while (isWater(e.tx, e.ty) || Math.hypot(e.tx - HUT.x, e.ty - HUT.y) < 50);
      if (e.x === 0) { e.x = e.tx; e.y = e.ty; }               // first placement
      continue;
    }
    const d = Math.hypot(e.tx - e.x, e.ty - e.y), k = Math.min(1, WANDER.speed * dt / d);
    e.facing = e.tx < e.x ? -1 : 1;
    e.x += (e.tx - e.x) * k; e.y += (e.ty - e.y) * k;
  }
}

// Flow: menu -> classSelect -> starterPick -> playing <-> (levelup | paused) -> result -> menu | starterPick.
let run = backdrop, scene, screen = null, classId = 'mage', held = false;
function go(next) {
  scene = next;
  if (next === 'menu') { run = backdrop; screen = menuScreen(assets, isMuted); }
  else if (next === 'classSelect') screen = classSelectScreen(assets, CLASSES);
  else if (next === 'book') screen = bookScreen(assets, CLASSES.mage, records.mage);
  else if (next === 'records') screen = recordsScreen(assets, CLASSES, records);
  else if (next === 'starterPick') { run = backdrop; screen = starterPickScreen(CLASSES[classId], assets); }
  else if (next === 'levelup') { screen = levelUpScreen(run, assets); sfx('levelup'); }
  else if (next === 'paused') screen = pauseScreen(assets);
  else if (next === 'result') {
    const won = run.state === 'won', res = { time: Math.floor(run.endAt ?? run.time), kills: run.kills, level: run.prog.level, won };
    const m = mergeResult(records, classId, { ...res, fusions: run.build.fusions });
    records = m.records; saveRecords(storage, records);
    screen = resultScreen(assets, { ...res, fusions: run.build.fusions, found: run.found, newBest: m.newBest });
  } else screen = null;                                   // playing
}
go('menu');

const ACT = {
  menu: a => a === 'play' ? go('classSelect') : a === 'book' ? go('book') : a === 'records' ? go('records') : toggleMute(),
  classSelect: a => a === 'back' ? go('menu') : (classId = a, go('starterPick')),
  book: () => go('menu'),
  records: () => go('menu'),
  starterPick: id => { run = createRun(classId, id, Date.now(), assets, discoveredSet(records, classId)); go('playing'); },
  levelup: card => {
    if (card.kind === 'fusion') { records = recordFusion(records, classId, card.id); saveRecords(storage, records); }   // discovered forever, before the run can end
    chooseCard(run, card); go(run.state === 'levelup' ? 'levelup' : 'playing');   // a fresh screen per pending level
  },
  paused: a => { if (a === 'forfeit') run.player.hp = 0; go('playing'); },   // forfeit: he falls like any death, then the result
  result: a => go(a === 'again' ? 'starterPick' : 'menu'),
};

// What ?debug (src/debug.js) may touch. The run is replaced on each new run, hence the getter.
const game = {
  get run() { return run; }, assets, spawnEnemy, overlays: [],
  clearDiscoveries() {                                    // ?debug F9: forget every fusion of this class, cards go back to "???"
    records = { ...records, [classId]: { ...records[classId], fusions: {} } }; saveRecords(storage, records);
    run.discovered.clear();
  },
};
if (new URLSearchParams(location.search).has('debug')) import('./debug.js').then(m => m.install(game)).catch(() => {});

initInput(canvas);
startLoop(
  dt => {
    if (scene === 'playing') {
      if (!run.ending && input.pressed('Escape')) go('paused');
      else {
        held = run.fx.frozen(); updateRun(run, dt, input); updateBanner(run, dt);
        if (run.state === 'levelup') go('levelup');
        else if (run.state === 'won' || run.state === 'lost') go('result');
      }
    } else {
      if (run === backdrop) wander(backdrop, dt);
      const a = screen.update(input);
      if (a) { sfx('click'); ACT[scene](a); }
    }
    if (!held) input.endFrame();                          // per sim step: a tap is never cleared before a step reads it (nor during hitstop)
    held = false;
  },
  () => {
    drawRun(ctx, run, assets);
    if (run !== backdrop && scene !== 'result') drawHud(ctx, run, assets);
    for (const draw of game.overlays) draw(ctx);
    screen?.draw(ctx);
  });

// Hidden tab or lost focus: the pause screen (the run holds still; the loop keeps stepping so its input works).
const autoPause = () => { if (scene === 'playing' && !run.ending) go('paused'); };
document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });
addEventListener('blur', autoPause);
