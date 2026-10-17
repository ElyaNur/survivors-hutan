// In-run HUD: xp bar, level, timer, kills, hp under the player, build slots, recipe panel, ult banner.
import { NAMES } from '../data/classes.js';
import { xpToNext } from '../logic/progression.js';
import { camera } from '../game/world.js';
import { drawText, textWidth } from '../engine/font.js';

const W = 480, H = 270, SLOTS = 4, MAX_LV = 5, BANNER_T = 2.5;
const C = { k: '#1d1a2f', K: '#6b1c33', r: '#e2585e', i: '#ff9f9a', b: '#4aa8e0', s: '#8fd3f5', B: '#2f6fc4', Y: '#ffd23f', y: '#fff1a8', Z: '#463a72' };

export const formatTime = sec => {
  const s = Math.floor(sec);
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
};

// One ult at a time: takes the next entry from run.newUlts and shows it for BANNER_T s.
export function updateBanner(run, dt) {
  if (run.banner && (run.banner.t += dt) >= BANNER_T) run.banner = null;
  if (!run.banner && run.newUlts.length) run.banner = { id: run.newUlts.shift(), t: 0 };
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
  const { skills, passives } = run.build, sk = Object.keys(skills), ps = Object.keys(passives);
  const py = H - 30;
  assets.drawSlice(ctx, 'panel', 2, py, 174, 28, 3);
  for (let i = 0; i < SLOTS; i++) slot(ctx, assets, 6 + i * 20, py + 4, sk[i] && 'icon_' + sk[i], skills[sk[i]]);
  for (let i = 0; i < SLOTS; i++) slot(ctx, assets, 92 + i * 20, py + 4, ps[i] && 'icon_' + ps[i], passives[ps[i]]);
}

function drawRecipes(ctx, run, assets) {
  const { recipes } = run.classDef, { skills, ults } = run.build;
  const pw = 80, ph = 6 + recipes.length * 24, px = W - 2 - pw, py = H - 2 - ph;
  assets.drawSlice(ctx, 'panel', px, py, pw, ph, 3);
  recipes.forEach((r, k) => {
    const y = py + 4 + k * 24, has = ults.includes(r.ult);
    const ing = id => 'icon_' + id + (skills[id] ? '' : '_off');
    slot(ctx, assets, px + 4, y, ing(r.a), skills[r.a]);
    drawText(ctx, assets, '+', px + 24, y + 7, { color: 'x' });
    slot(ctx, assets, px + 30, y, ing(r.b), skills[r.b]);
    drawText(ctx, assets, '→', px + 50, y + 7, { color: has ? 'y' : 'x' });
    slot(ctx, assets, px + 58, y, 'icon_' + r.ult + (has ? '' : '_off'), 0, has);
  });
}

function drawBanner(ctx, run, assets) {
  const { id, t } = run.banner, open = Math.min(1, t / 0.15), alpha = Math.min(1, (BANNER_T - t) / 0.4);
  const cy = 74, h = Math.round(36 * open);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(29, 26, 47, 0.88)'; ctx.fillRect(0, cy - h / 2, W, h);
  ctx.fillStyle = C.Y; ctx.fillRect(0, cy - h / 2, W, 1); ctx.fillRect(0, cy + h / 2 - 1, W, 1);
  ctx.restore();
  if (open < 1) return;
  const title = `ULTIMATE TERBUKA: ${NAMES[id].name}!`;
  drawText(ctx, assets, title, W / 2 + 10, cy - 12, { color: t < 0.3 && Math.floor(t * 20) % 2 ? 'w' : 'y', align: 'center', scale: 2, alpha });
  drawText(ctx, assets, NAMES[id].desc, W / 2 + 10, cy + 5, { align: 'center', alpha });
  assets.draw(ctx, 'icon_' + id, W / 2 + 10 - textWidth(title, 2) / 2 - 14, cy - 3, { alpha });   // icon left of the title
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
  drawText(ctx, assets, formatTime(run.time), W / 2, 12, { align: 'center', scale: 2 });
  drawText(ctx, assets, String(run.kills), W - 4, 13, { align: 'right' });
  assets.draw(ctx, 'icon_kill', W - 4 - textWidth(String(run.kills)) - 7, 15);
  // hp under the player (same rounding as drawRun's camera)
  const cam = camera(p), sx = Math.round(p.x - Math.round(cam.x)), sy = Math.round(p.y - Math.round(cam.y)) + 15;
  const hp = Math.round(16 * Math.max(0, p.hp) / p.maxHp);
  ctx.fillStyle = C.k; ctx.fillRect(sx - 9, sy, 18, 4);
  ctx.fillStyle = C.K; ctx.fillRect(sx - 8, sy + 1, 16, 2);
  ctx.fillStyle = C.r; ctx.fillRect(sx - 8, sy + 1, hp, 2);
  ctx.fillStyle = C.i; ctx.fillRect(sx - 8, sy + 1, hp, 1);
  drawBuild(ctx, run, assets);
  drawRecipes(ctx, run, assets);
  if (run.banner) drawBanner(ctx, run, assets);
}
