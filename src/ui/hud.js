// In-run HUD: xp bar, level, timer, kills, hp under the player, build slots, fusion banner.
import { NAMES } from '../data/classes.js';
import { xpToNext, fusionFor } from '../logic/progression.js';
import { camera } from '../game/world.js';
import { drawText, textWidth } from '../engine/font.js';
import TUNING from '../data/tuning.js';
import { VIEW } from '../engine/view.js';

const W = 480, H = 270, SLOTS = 4, MAX_LV = 5, BANNER_T = 2.5, BANNER_X = 24, BANNER_EDGE = 8;   // ult_banner: 9-slice edge px
const C = { k: '#1d1a2f', K: '#6b1c33', r: '#e2585e', i: '#ff9f9a', R: '#a3324a', b: '#4aa8e0', s: '#8fd3f5', B: '#2f6fc4', Y: '#ffd23f', y: '#fff1a8', Z: '#463a72' };
const BOSS_NAMES = { kingSlime: 'RAJA SLIME', orcChief: 'KEPALA ORC', treant: 'POHON TUA' };
const BOSS_W = 200, BOSS_Y = 32, CHIP_EASE = 0.06;         // boss bar width, top; how fast the white damage chip catches up (per frame)

export const formatTime = sec => {
  const s = Math.floor(sec);
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
};

// One fusion at a time: takes the next {id, first} from run.newFusions and shows it for BANNER_T s.
export function updateBanner(run, dt) {
  if (run.banner && (run.banner.t += dt) >= BANNER_T) run.banner = null;
  if (run.banner || !run.newFusions.length) return;
  run.banner = { ...run.newFusions.shift(), t: 0 };
  const fx = run.fx, { shakeUlt, hitstopUlt } = TUNING.fx;   // the unlock lands like a blow; a repeat only shakes
  fx.shake(shakeUlt.px, shakeUlt.dur);
  if (!run.banner.first) return;
  fx.hitstop(hitstopUlt);
  fx.anim(run.player.x, run.player.y, 'fx_ultFlash');
}

function pips(ctx, x, y, lv) {
  ctx.fillStyle = C.k; ctx.fillRect(x + 1, y, 16, 4);
  for (let i = 0; i < MAX_LV; i++) {
    ctx.fillStyle = i < lv ? (lv === MAX_LV ? C.y : C.Y) : C.Z;
    ctx.fillRect(x + 2 + i * 3, y + 1, 2, 2);
  }
}

// Icon in a slot; lv > 0 adds the pip strip, overlapping the slot's bottom edge.
function slot(ctx, assets, x, y, iconName, lv = 0, lit = false) {
  assets.drawSlice(ctx, lit ? 'slot_lit' : 'slot', x, y, 18, 18, 2);
  if (iconName) assets.draw(ctx, iconName, x + 9, y + 9);
  if (lv) pips(ctx, x, y + 16, lv);
}

function drawBuild(ctx, run, assets) {
  const { skills, passives, fusions } = run.build, sk = Object.keys(skills), ps = Object.keys(passives);
  const py = H - 30;
  assets.drawSlice(ctx, 'panel', 2, py, 174, 28, 3);
  for (let i = 0; i < SLOTS; i++) {                          // skills, then the fusions that replaced pairs of them
    const f = fusions[i - sk.length];
    if (f) slot(ctx, assets, 6 + i * 20, py + 4, 'icon_' + f, 0, true);
    else slot(ctx, assets, 6 + i * 20, py + 4, sk[i] && 'icon_' + sk[i], skills[sk[i]]);
  }
  for (let i = 0; i < SLOTS; i++) slot(ctx, assets, 92 + i * 20, py + 4, ps[i] && 'icon_' + ps[i], passives[ps[i]]);
}

// Held skill pairs that can fuse, closest first (max 3): A + B → result (? until discovered). Lights up at 5 + 5.
const ROW_H = 21, PANEL_W = 82;
function drawFusionPanel(ctx, run, assets) {
  const { skills } = run.build, sk = Object.keys(skills), pairs = [];
  for (let i = 0; i < sk.length; i++) for (let j = i + 1; j < sk.length; j++) {
    const f = fusionFor(run.classDef, sk[i], sk[j]);
    if (f) pairs.push({ f, a: sk[i], b: sk[j], sum: skills[sk[i]] + skills[sk[j]] });
  }
  if (!pairs.length) return;
  pairs.sort((p, q) => q.sum - p.sum);
  const rows = pairs.slice(0, 3), h = rows.length * ROW_H + 6, y0 = H - 30 - 2 - h;
  assets.drawSlice(ctx, 'panel', 2, y0, PANEL_W, h, 3);
  rows.forEach(({ f, a, b }, n) => {
    const y = y0 + 4 + n * ROW_H, lit = skills[a] === MAX_LV && skills[b] === MAX_LV, c = lit ? 'y' : 'x';
    slot(ctx, assets, 6, y, 'icon_' + a, skills[a], lit);
    drawText(ctx, assets, '+', 28, y + 6, { color: c, align: 'center' });
    slot(ctx, assets, 33, y, 'icon_' + b, skills[b], lit);
    drawText(ctx, assets, '→', 56, y + 6, { color: c, align: 'center' });
    slot(ctx, assets, 62, y, run.discovered.has(f.id) ? 'icon_' + f.id : 'icon_unknown', 0, lit);
  });
}

function drawBanner(ctx, run, assets) {
  const { id, first, t } = run.banner, open = Math.min(1, t / 0.15), alpha = Math.min(1, (BANNER_T - t) / 0.4);
  const cy = 74, h = Math.round(36 * open);
  ctx.save();
  ctx.globalAlpha = alpha;
  if (h >= 2 * BANNER_EDGE) assets.drawSlice(ctx, 'ult_banner', BANNER_X, cy - h / 2, W - 2 * BANNER_X, h, BANNER_EDGE);
  ctx.restore();
  if (open < 1) return;
  const title = `${first ? 'FUSION BARU' : 'FUSION'}: ${NAMES[id].name}!`;
  drawText(ctx, assets, title, W / 2 + 10, cy - 12, { color: t < 0.3 && Math.floor(t * 20) % 2 ? 'w' : 'y', align: 'center', scale: 2, alpha });
  drawText(ctx, assets, NAMES[id].desc, W / 2 + 10, cy + 5, { align: 'center', alpha });
  assets.draw(ctx, 'icon_' + id, W / 2 + 10 - textWidth(title, 2) / 2 - 14, cy - 3, { alpha });   // icon left of the title
}

const liveBoss = e => !e.dead && e.type in BOSS_NAMES;
// The newest live boss: name over a red bar, a pale chip trailing each blow. Falls back to any other live boss.
function drawBossBar(ctx, run, assets) {
  let b = run.boss;
  if (!b || b.dead) b = run.boss = run.enemies.find(liveBoss) ?? null;
  if (!b) return;
  const x = (W - BOSS_W) / 2, inner = BOSS_W - 4, hp = Math.max(0, b.hp) / b.maxHp;
  // ponytail: the chip eases per drawn frame (no dt in the HUD); fine at 60 FPS, frame-rate bound otherwise
  b.chip = Math.max(hp, (b.chip ?? 1) - Math.max(0.002, ((b.chip ?? 1) - hp) * CHIP_EASE));
  drawText(ctx, assets, BOSS_NAMES[b.type], W / 2, BOSS_Y - 8, { color: 'r', align: 'center' });
  assets.drawSlice(ctx, 'bar', x, BOSS_Y, BOSS_W, 8, 2);
  ctx.fillStyle = C.K; ctx.fillRect(x + 2, BOSS_Y + 2, inner, 4);
  ctx.fillStyle = C.y; ctx.fillRect(x + 2, BOSS_Y + 2, Math.round(inner * b.chip), 4);
  const fill = Math.round(inner * hp);
  ctx.fillStyle = C.r; ctx.fillRect(x + 2, BOSS_Y + 2, fill, 4);
  ctx.fillStyle = C.i; ctx.fillRect(x + 2, BOSS_Y + 2, fill, 1);
  ctx.fillStyle = C.R; ctx.fillRect(x + 2, BOSS_Y + 5, fill, 1);
}

export function drawHud(ctx, run, assets) {
  const { prog, player: p } = run;
  // xp bar across the top
  assets.drawSlice(ctx, 'bar', 1, 1, W - 2, 8, 2);
  const fill = Math.round((W - 6) * Math.min(1, prog.xp / xpToNext(prog.level)));
  ctx.fillStyle = C.b; ctx.fillRect(3, 3, fill, 4);
  ctx.fillStyle = C.s; ctx.fillRect(3, 3, fill, 1);
  ctx.fillStyle = C.B; ctx.fillRect(3, 6, fill, 1);
  drawText(ctx, assets, `Lv ${prog.level}`, 4, 12, { color: 'y' });
  drawText(ctx, assets, formatTime(run.endAt ?? run.time), W / 2, 12, { align: 'center', scale: 2 });   // stops when the run ends
  drawText(ctx, assets, String(run.kills), W - 4, 13, { align: 'right' });
  assets.draw(ctx, 'icon_kill', W - 4 - textWidth(String(run.kills)) - 7, 15);
  if (run.ending !== 'lost') drawPlayerHp(ctx, p);         // gone once he has fallen
  drawBossBar(ctx, run, assets);
  drawBuild(ctx, run, assets);
  drawFusionPanel(ctx, run, assets);
  if (run.banner) drawBanner(ctx, run, assets);
}

// hp under the player (same rounding as drawRun's camera)
function drawPlayerHp(ctx, p) {
  const cam = camera(p), sx = Math.round(p.x - Math.round(cam.x)), sy = Math.round(p.y - Math.round(cam.y)) + 15;
  const hp = Math.round(16 * Math.max(0, p.hp) / p.maxHp);
  ctx.fillStyle = C.k; ctx.fillRect(sx - 9, sy, 18, 4);
  ctx.fillStyle = C.K; ctx.fillRect(sx - 8, sy + 1, 16, 2);
  ctx.fillStyle = C.r; ctx.fillRect(sx - 8, sy + 1, hp, 2);
  ctx.fillStyle = C.i; ctx.fillRect(sx - 8, sy + 1, hp, 1);
}

// ---- Touch: the pause button (top right, under the kills) and the stick while a finger holds it.
export const pauseRect = () => {
  const { right, y, size } = TUNING.touch.pause;
  return { x: VIEW.w - right, y, w: size, h: size };
};
export const pauseHit = m => {
  const { x, y, w: size } = pauseRect(), { pad } = TUNING.touch.pause;
  return m.x >= x - pad && m.x < x + size + pad && m.y >= y - pad && m.y < y + size + pad;
};

// A pixel-hard disc of radius r, cached: `px(d, dx, dy)` gives each pixel's colour (or null) by its distance from the centre.
const discs = {};
function disc(name, r, px) {
  if (!discs[name]) {
    const c = document.createElement('canvas'); c.width = c.height = 2 * r + 1;
    const g = c.getContext('2d');
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const col = px(Math.hypot(x, y), x, y);
      if (col) { g.fillStyle = col; g.fillRect(x + r, y + r, 1, 1); }
    }
    discs[name] = c;
  }
  return discs[name];
}

export function drawTouch(ctx, assets, input) {
  const { stickR: R, alpha } = TUNING.touch, b = pauseRect();
  slot(ctx, assets, b.x, b.y, null);
  ctx.fillStyle = C.y; ctx.fillRect(b.x + 6, b.y + 5, 2, 8); ctx.fillRect(b.x + 10, b.y + 5, 2, 8);
  const s = input.stick;
  if (!s) return;
  const K = 8, dx = s.x - s.ox, dy = s.y - s.oy, d = Math.hypot(dx, dy), k = d > R ? R / d : 1;
  const base = disc('base', R, d => d > R + 0.5 ? null : d > R - 0.5 ? C.k : d > R - 1.5 ? C.y : d > R - 2.5 ? C.k : 'rgba(29, 26, 47, 0.4)');
  const knob = disc('knob', K, (d, x, y) => d > K + 0.5 ? null : d > K - 0.5 ? C.k : x + y > K * 0.6 ? C.Y : C.y);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(base, Math.round(s.ox) - R, Math.round(s.oy) - R);
  ctx.drawImage(knob, Math.round(s.ox + dx * k) - K, Math.round(s.oy + dy * k) - K);
  ctx.restore();
}
