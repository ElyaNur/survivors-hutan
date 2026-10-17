// Card screens: the starter pick (6 skills) and the level-up (3 cards). The world is frozen behind them.
import TUNING from '../data/tuning.js';
import { NAMES } from '../data/classes.js';
import { recipeTags } from '../logic/progression.js';
import { drawText, wrapText } from '../engine/font.js';

const W = 480, H = 270, STEP = 1 / 60;   // update() runs once per fixed sim step
const LOCK = 0.3;                        // s before a pick counts: no accidental pick from a mid-fight key or click
const MAX_LV = 5;

// Card rects, `cols` per row, rows centred horizontally, starting at `top`.
export function layoutCards(n, cols, w, h, gap, top) {
  const rects = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / cols), inRow = Math.min(cols, n - row * cols), col = i % cols;
    const x0 = Math.round((W - inRow * w - (inRow - 1) * gap) / 2);
    rects.push({ x: x0 + col * (w + gap), y: top + row * (h + gap), w, h });
  }
  return rects;
}

export const cardAt = (rects, x, y) => rects.findIndex(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);

// What a card shows. build/classDef give the level line and the recipe tags.
export function cardInfo(card, classDef, build) {
  if (card.kind === 'heal') return { icon: 'icon_heal', name: 'Isi HP', desc: `Pulihkan ${TUNING.healCard} HP.`, level: null, tags: [] };
  const n = card.nextLevel, { name, desc } = NAMES[card.id];
  const tags = card.kind !== 'skill' ? [] : recipeTags(classDef, card.id).map(ult => {
    const r = classDef.recipes.find(q => q.ult === ult), partner = r.a === card.id ? r.b : r.a;
    return { text: '★ ' + NAMES[ult].name, unlocks: n === MAX_LV && (build.skills[partner] || 0) >= MAX_LV };   // this pick completes it
  });
  return { icon: 'icon_' + card.id, name, desc, level: n === 1 ? 'Baru!' : `Lv ${n - 1}→${n}`, tags };
}

// Keyboard (number keys, arrows/WASD + Enter/Space) and mouse (hover, click) over a set of card rects.
function createPicker(rects, cols) {
  const n = rects.length;
  let lastX = null, lastY = null;
  const p = {
    sel: 0, t: 0,
    // index of the picked card, or -1
    update(input) {
      p.t += STEP;
      const ready = p.t >= LOCK, m = input.mouse, hit = cardAt(rects, m.x, m.y);
      if ((lastX !== null && (m.x !== lastX || m.y !== lastY)) && hit >= 0) p.sel = hit;   // hover, only when the mouse moves
      lastX = m.x; lastY = m.y;
      const key = (...codes) => codes.map(c => input.pressed(c)).some(Boolean);   // consume every alias
      for (let i = 0; i < n && i < 9; i++) if (key('Digit' + (i + 1), 'Numpad' + (i + 1))) { p.sel = i; if (ready) return i; }
      if (key('ArrowLeft', 'KeyA')) p.sel = (p.sel + n - 1) % n;
      if (key('ArrowRight', 'KeyD')) p.sel = (p.sel + 1) % n;
      if (key('ArrowUp', 'KeyW') && p.sel - cols >= 0) p.sel -= cols;
      if (key('ArrowDown', 'KeyS') && p.sel + cols < n) p.sel += cols;
      if (key('Enter', 'NumpadEnter', 'Space') && ready) return p.sel;
      if (m.clicked && hit >= 0 && ready) { p.sel = hit; return hit; }
      return -1;
    },
  };
  return p;
}

// ---- Drawing
const ease = k => 1 - (1 - Math.min(Math.max(k, 0), 1)) ** 3;

function dim(ctx) { ctx.fillStyle = 'rgba(15, 12, 30, 0.72)'; ctx.fillRect(0, 0, W, H); }

function drawCard(ctx, assets, info, r, i, picker) {
  const sel = picker.sel === i, t = picker.t;
  const y = r.y + Math.round((1 - ease((t - i * 0.05) / 0.25)) * 18) - (sel ? 2 : 0), x = r.x;   // slide in, lift when selected
  assets.drawSlice(ctx, sel ? 'card_sel' : 'card', x, y, r.w, r.h, 5);
  assets.drawSlice(ctx, sel ? 'slot_lit' : 'slot', x + 7, y + 7, 18, 18, 2);
  assets.draw(ctx, info.icon, x + 16, y + 16);
  drawText(ctx, assets, info.name, x + 30, y + 9, { color: sel ? 'w' : 'y' });
  if (info.level) drawText(ctx, assets, info.level, x + 30, y + 18, { color: info.level === 'Baru!' ? 'g' : 'c' });
  if (i < 9) drawText(ctx, assets, String(i + 1), x + r.w - 8, y + 7, { color: sel ? 'y' : 'x' });
  wrapText(info.desc, r.w - 16).forEach((line, k) => drawText(ctx, assets, line, x + 8, y + 32 + k * 8, { color: sel ? 'w' : 'x' }));
  info.tags.forEach((tag, k) => {
    const flash = tag.unlocks && Math.floor(t * 4) % 2;
    drawText(ctx, assets, tag.text + (tag.unlocks ? '!' : ''), x + 8, y + r.h - 12 - (info.tags.length - 1 - k) * 8, { color: flash ? 'w' : 'y' });
  });
}

function cardScreen(assets, infos, rects, cols, { title, sub, hint }) {
  const picker = createPicker(rects, cols);
  return {
    picker,
    update: input => picker.update(input),
    draw(ctx) {
      dim(ctx);
      const ty = rects[0].y - 26;
      drawText(ctx, assets, title, W / 2, ty, { color: 'y', align: 'center', scale: 2 });
      if (sub) drawText(ctx, assets, sub, W / 2, ty + 14, { color: 'x', align: 'center' });
      infos.forEach((info, i) => drawCard(ctx, assets, info, rects[i], i, picker));
      const last = rects[rects.length - 1];
      drawText(ctx, assets, hint, W / 2, last.y + last.h + 8, { color: 'x', align: 'center' });
    },
  };
}

// update(input) -> the chosen card, or null.
export function levelUpScreen(run, assets) {
  const cards = run.cards, rects = layoutCards(cards.length, 3, 120, 104, 12, 92);
  const more = run.pendingLevelUps - 1;
  const s = cardScreen(assets, cards.map(c => cardInfo(c, run.classDef, run.build)), rects, 3, {
    title: 'Naik level!', sub: `Lv ${run.prog.level}` + (more > 0 ? ` (+${more} lagi)` : ''),
    hint: `${cards.map((_, i) => i + 1).join('/')}, panah + Enter, atau klik`,
  });
  return { ...s, update: input => { const i = s.update(input); return i < 0 ? null : cards[i]; } };
}

// update(input) -> the chosen skill id, or null.
export function starterPickScreen(classDef, assets) {
  const ids = classDef.skills, rects = layoutCards(ids.length, 3, 120, 84, 8, 50);
  const noBuild = { skills: {} };
  const s = cardScreen(assets, ids.map(id => ({ ...cardInfo({ kind: 'skill', id, nextLevel: 1 }, classDef, noBuild), level: null })), rects, 3, {
    title: 'Pilih skill awal', sub: `Skill pertama ${classDef.name}. Skill lain datang saat naik level.`,
    hint: '1-6, panah + Enter, atau klik',
  });
  return { ...s, update: input => { const i = s.update(input); return i < 0 ? null : ids[i]; } };
}
