// Card screens (starter pick, level-up) and the menus (main, class select, records, pause, result).
import TUNING from '../data/tuning.js';
import { NAMES } from '../data/classes.js';
import { drawText, wrapText, textWidth } from '../engine/font.js';
import { formatTime } from './hud.js';
import { fusionFor } from '../logic/progression.js';
import { EMPTY_RECORD, discoveredSet } from '../logic/records.js';

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

// What a card shows. build/classDef give the level line and the recipe tags; `discovered` (fusion ids) unhides names.
export function cardInfo(card, classDef, build, discovered = new Set()) {
  if (card.kind === 'heal') return { icon: 'icon_heal', name: 'Isi HP', desc: `Pulihkan ${TUNING.healCard} HP.`, level: null, tags: [] };
  if (card.kind === 'fusion') {
    const seen = discovered.has(card.id), mix = `${NAMES[card.a].name} + ${NAMES[card.b].name}`;
    return seen ? { icon: 'icon_' + card.id, name: NAMES[card.id].name, level: 'Fusion!', desc: `${mix}. ${NAMES[card.id].desc}`, tags: [] }
      : { icon: 'icon_unknown', name: '???', level: 'Fusion!', desc: `${mix} = ???`, tags: [] };
  }
  const n = card.nextLevel, { name, desc } = NAMES[card.id], tags = [];
  if (card.kind === 'skill') for (const other of Object.keys(build.skills)) {   // one ★ per fusion this skill could join
    const f = other !== card.id && fusionFor(classDef, card.id, other);
    if (f) tags.push({ text: '★ ' + (discovered.has(f.id) ? NAMES[f.id].name : '???'), unlocks: n === MAX_LV && build.skills[other] === MAX_LV });
  }
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
  if (info.level) drawText(ctx, assets, info.level, x + 30, y + 18, { color: info.level === 'Baru!' ? 'g' : info.level === 'Fusion!' ? 'l' : 'c' });   // fusion line in lavender: never the name's gold
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
      drawText(ctx, assets, hint, W / 2, last.y + last.h + 12, { color: 'x', align: 'center' });   // clear of the bottom row's frames
    },
  };
}

// update(input) -> the chosen card, or null.
export function levelUpScreen(run, assets) {
  const cards = run.cards, rects = layoutCards(cards.length, 3, 120, 104, 12, 92);
  const more = run.pendingLevelUps - 1;
  const s = cardScreen(assets, cards.map(c => cardInfo(c, run.classDef, run.build, run.discovered)), rects, 3, {
    title: 'Naik level!', sub: `Lv ${run.prog.level}` + (more > 0 ? ` (+${more} lagi)` : ''),
    hint: `${cards.map((_, i) => i + 1).join('/')}, panah + Enter, atau klik`,
  });
  return { ...s, update: input => { const i = s.update(input); return i < 0 ? null : cards[i]; } };
}

// update(input) -> the chosen skill id, or null.
export function starterPickScreen(classDef, assets) {
  const ids = classDef.skills, rects = layoutCards(ids.length, 3, 120, 84, 8, 50);
  const noBuild = { skills: {}, fusions: [] };
  const s = cardScreen(assets, ids.map(id => ({ ...cardInfo({ kind: 'skill', id, nextLevel: 1 }, classDef, noBuild), level: null })), rects, 3, {
    title: 'Pilih skill awal', sub: `Skill pertama ${classDef.name}. Skill lain datang saat naik level.`,
    hint: '1-6, panah + Enter, atau klik',
  });
  return { ...s, update: input => { const i = s.update(input); return i < 0 ? null : ids[i]; } };
}

// ---- Menus. Each update(input) returns an action string (or a class id), else null. Esc = back where there is one.
// A row/column of framed buttons over the shared picker. labels: strings, or functions for live text.
function buttons(assets, labels, rects, cols) {
  const picker = createPicker(rects, cols);
  return {
    picker,
    update: input => picker.update(input),
    draw(ctx) {
      labels.forEach((l, i) => {
        const r = rects[i], sel = picker.sel === i, y = r.y - (sel ? 1 : 0);
        assets.drawSlice(ctx, sel ? 'card_sel' : 'card', r.x, y, r.w, r.h, 5);
        drawText(ctx, assets, typeof l === 'function' ? l() : l, r.x + r.w / 2, y + (r.h - 5) / 2, { color: sel ? 'w' : 'y', align: 'center' });
      });
    },
  };
}

// Big title, cached per string: the text over a solid extrusion (its silhouette stacked downward) and a dark base.
const titles = {};
function title(ctx, assets, str, y, scale, color = 'y') {
  const key = str + scale + color;
  if (!titles[key]) {
    const depth = 2 * scale, w = textWidth(str, scale) + 2 * scale, h = 7 * scale;
    const solid = fill => {                                  // the text's silhouette (ink + outline) in one colour
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
      drawText(g, assets, str, scale, scale, { color, scale });
      if (fill) { g.globalCompositeOperation = 'source-in'; g.fillStyle = fill; g.fillRect(0, 0, w, h); }
      return c;
    };
    const out = document.createElement('canvas'); out.width = w; out.height = h + depth + 1;
    const g = out.getContext('2d'), text = solid(), side = solid(color === 'r' ? '#6b1c33' : '#a3324a');   // palette K / R
    g.drawImage(solid('#1d1a2f'), 0, depth + 1);
    for (let d = depth; d > 0; d--) g.drawImage(side, 0, d);
    g.drawImage(text, 0, 0);
    titles[key] = out;
  }
  const c = titles[key];
  ctx.drawImage(c, Math.round(W / 2 - c.width / 2), Math.round(y - scale));
}

const hint = (ctx, assets, str, y = H - 12) => drawText(ctx, assets, str, W / 2, y, { align: 'center' });

// Main menu over the live forest. -> 'play' | 'book' | 'records' | 'sound'
let shade = null;                                          // gradients, built once on the first menu draw
export function menuScreen(assets, isMuted) {
  const ACTIONS = ['play', 'book', 'records', 'sound'];
  const b = buttons(assets, ['Main', 'Buku Resep', 'Rekor', () => 'Suara: ' + (isMuted() ? 'Mati' : 'Nyala')], layoutCards(4, 4, 100, 20, 6, 196), 4);
  return {
    update: input => ACTIONS[b.update(input)] ?? null,
    draw(ctx) {
      if (!shade) {
        const top = ctx.createLinearGradient(0, 0, 0, 80), edge = ctx.createRadialGradient(W / 2, H / 2, 90, W / 2, H / 2, 290);
        top.addColorStop(0, 'rgba(29, 26, 47, 0.85)'); top.addColorStop(1, 'rgba(29, 26, 47, 0)');
        edge.addColorStop(0, 'rgba(29, 26, 47, 0)'); edge.addColorStop(1, 'rgba(29, 26, 47, 0.6)');
        shade = { top, edge };
      }
      ctx.fillStyle = shade.edge; ctx.fillRect(0, 0, W, H);   // vignette: the eye lands on the hut and the mage
      ctx.fillStyle = shade.top; ctx.fillRect(0, 0, W, 80);    // dusk band so the title reads
      title(ctx, assets, 'SURVIVORS HUTAN', 12, 4);
      drawText(ctx, assets, 'Bertahan 20 menit di Hutan Cerah', W / 2, 46, { color: 'w', align: 'center' });
      b.draw(ctx);
      hint(ctx, assets, 'Panah + Enter, atau klik', H - 14);
    },
  };
}

const CLASS_INFO = { mage: { sprite: 'mage_idle', desc: 'Penyihir jarak jauh. 6 skill, 15 fusion.' } };

// One class card: the hero (or a locked '?'), name, and a body drawn by `body(x, y)`.
// A selected locked card lights up violet (never gold: gold means pickable); `shake` s left of a refused pick.
function classCard(ctx, assets, cls, r, sel, t, body, shake = 0) {
  const x = r.x + Math.round(Math.sin(shake * 60) * 3 * Math.min(1, shake * 4)), y = r.y - (sel ? 2 : 0);
  assets.drawSlice(ctx, cls.locked ? (sel ? 'card' : 'card_off') : sel ? 'card_sel' : 'card', x, y, r.w, r.h, 5);
  assets.drawSlice(ctx, cls.locked ? 'slot' : sel ? 'slot_lit' : 'slot', x + r.w / 2 - 24, y + 10, 48, 60, 2);
  if (cls.locked) {
    drawText(ctx, assets, '?', x + r.w / 2, y + 26, { color: 'x', align: 'center', scale: 5 });
    assets.draw(ctx, 'icon_lock', x + r.w / 2 + 17, y + 62);
  } else assets.draw(ctx, CLASS_INFO[cls.id].sprite, x + r.w / 2, y + 40, { t: t * 1000, scale: 2 });
  drawText(ctx, assets, cls.name, x + r.w / 2, y + 78, { color: cls.locked ? 'x' : sel ? 'w' : 'y', align: 'center', scale: 2 });
  body(x, y + 96);
}

const CLASS_RECTS = () => layoutCards(3, 3, 128, 150, 12, 54);

// -> class id | 'back'. Locked classes can be looked at, not picked.
export function classSelectScreen(assets, classes) {
  const list = Object.values(classes), rects = CLASS_RECTS(), picker = createPicker(rects, 3);
  let t = 0, shake = 0;
  return {
    update(input) {
      t += STEP; shake = Math.max(0, shake - STEP);
      if (input.pressed('Escape')) return 'back';
      const i = picker.update(input);
      if (i >= 0 && list[i].locked) shake = 0.3;              // not yet: the card shakes its head
      return i >= 0 && !list[i].locked ? list[i].id : null;
    },
    draw(ctx) {
      dim(ctx);
      title(ctx, assets, 'Pilih kelas', 20, 2);
      list.forEach((cls, i) => classCard(ctx, assets, cls, rects[i], picker.sel === i, t, (x, y) => {
        if (cls.locked) drawText(ctx, assets, 'Segera', x + 64, y + 10, { color: 'y', align: 'center', scale: 2 });
        else wrapText(CLASS_INFO[cls.id].desc, 112).forEach((l, k) => drawText(ctx, assets, l, x + 8, y + k * 8, { color: picker.sel === i ? 'w' : 'x' }));
      }, picker.sel === i ? shake : 0));
      hint(ctx, assets, '1-3, panah + Enter, atau klik. Esc: kembali');
    },
  };
}

// Per-class bests. -> 'back'
export function recordsScreen(assets, classes, records) {
  const list = Object.values(classes), rects = CLASS_RECTS();
  const back = buttons(assets, ['Kembali'], layoutCards(1, 1, 100, 20, 0, 216), 1);
  let t = 0;
  return {
    update(input) {
      t += STEP;
      return input.pressed('Escape') || back.update(input) === 0 ? 'back' : null;
    },
    draw(ctx) {
      dim(ctx);
      title(ctx, assets, 'Rekor', 20, 2);
      list.forEach((cls, i) => classCard(ctx, assets, cls, { ...rects[i], h: 154 }, false, t, (x, y) => {
        if (cls.locked) { drawText(ctx, assets, 'Segera', x + 64, y + 10, { color: 'y', align: 'center', scale: 2 }); return; }
        const r = { ...EMPTY_RECORD, ...records[cls.id] };
        [['Terlama', formatTime(r.bestTime)], ['Kill', r.bestKills], ['Level', r.bestLevel], ['Menang', r.wins]].forEach(([k, v], n) => {
          drawText(ctx, assets, k, x + 10, y + n * 9, { color: 'x' });
          drawText(ctx, assets, String(v), x + 118, y + n * 9, { align: 'right' });
        });
      }));
      back.draw(ctx);
    },
  };
}

// The recipe book: the class's fusions in a 5-wide grid (found ones named, the rest "???"), a detail panel, Kembali. -> 'back'
// `record` is records[classId] (maybe undefined, maybe v1-shaped); `found` is exposed for tests.
export function bookScreen(assets, classDef, record) {
  const fus = classDef.fusions, seen = discoveredSet({ [classDef.id]: record }, classDef.id);
  const rects = [...layoutCards(fus.length, 5, 88, 38, 4, 38), ...layoutCards(1, 1, 100, 20, 0, 216)];   // the last rect is Kembali
  const picker = createPicker(rects, 5);
  return {
    found: seen.size,
    update(input) {
      if (input.pressed('Escape')) return 'back';
      return picker.update(input) === fus.length ? 'back' : null;
    },
    draw(ctx) {
      dim(ctx);
      title(ctx, assets, 'Buku Resep', 8, 2);
      drawText(ctx, assets, `Ditemukan: ${seen.size}/${fus.length}`, W / 2, 28, { color: 'x', align: 'center' });
      fus.forEach((f, i) => {
        const r = rects[i], sel = picker.sel === i, y = r.y - (sel ? 1 : 0), cx = r.x + r.w / 2;
        assets.drawSlice(ctx, sel ? 'card_sel' : 'card', r.x, y, r.w, r.h, 5);
        if (seen.has(f.id)) {
          assets.draw(ctx, 'icon_' + f.id, cx, y + 13);
          drawText(ctx, assets, NAMES[f.id].name, cx, y + 26, { color: sel ? 'w' : 'y', align: 'center' });
        } else {
          assets.draw(ctx, 'icon_' + f.a, cx - 10, y + 13); assets.draw(ctx, 'icon_' + f.b, cx + 10, y + 13);
          drawText(ctx, assets, '???', cx, y + 26, { color: 'x', align: 'center' });
        }
      });
      const f = fus[picker.sel];                                            // detail of the selected slot (none on Kembali)
      assets.drawSlice(ctx, 'card', 24, 164, 432, 46, 5);
      if (f) {
        drawText(ctx, assets, `${NAMES[f.a].name} + ${NAMES[f.b].name}`, W / 2, 170, { color: 'y', align: 'center' });
        if (seen.has(f.id)) {
          const e = record.fusions[f.id];
          drawText(ctx, assets, NAMES[f.id].name, W / 2, 180, { align: 'center' });
          drawText(ctx, assets, NAMES[f.id].desc, W / 2, 189, { color: 'x', align: 'center' });
          drawText(ctx, assets, `Dibuat: ${e.made}   Menang: ${e.wins}`, W / 2, 198, { color: 'y', align: 'center' });
        } else {
          drawText(ctx, assets, '???', W / 2, 181, { align: 'center' });
          drawText(ctx, assets, 'Belum ditemukan.', W / 2, 192, { color: 'x', align: 'center' });
        }
      }
      const k = rects[fus.length], sel = picker.sel === fus.length, ky = k.y - (sel ? 1 : 0);
      assets.drawSlice(ctx, sel ? 'card_sel' : 'card', k.x, ky, k.w, k.h, 5);
      drawText(ctx, assets, 'Kembali', k.x + k.w / 2, ky + (k.h - 5) / 2, { color: sel ? 'w' : 'y', align: 'center' });
      hint(ctx, assets, 'Panah + Enter, atau klik. Esc: kembali');
    },
  };
}

// -> 'resume' | 'forfeit'. Esc toggles back. Menyerah asks twice: the click that refocuses the window after an
// auto-pause can land on it, and one stray click must never end a long run.
export function pauseScreen(assets) {
  let armed = false;
  const b = buttons(assets, ['Lanjut', () => (armed ? 'Yakin? Menyerah' : 'Menyerah')], layoutCards(2, 1, 110, 20, 8, 112), 1);
  return {
    update(input) {
      if (input.pressed('Escape')) return 'resume';
      const i = b.update(input);
      if (b.picker.sel !== 1) armed = false;                 // moved off it: ask again next time
      if (i === 0) return 'resume';
      if (i === 1) { if (armed) return 'forfeit'; armed = true; }
      return null;
    },
    draw(ctx) {
      dim(ctx);
      assets.drawSlice(ctx, 'panel', W / 2 - 80, 56, 160, 132, 3);
      title(ctx, assets, 'JEDA', 70, 3);
      b.draw(ctx);
      hint(ctx, assets, 'Esc: lanjut', 174);
    },
  };
}

// res: { won, time, kills, level, fusions, found, newBest }. -> 'again' | 'menu'
export function resultScreen(assets, res) {
  const ACTIONS = ['again', 'menu'], b = buttons(assets, ['Main lagi', 'Menu'], layoutCards(2, 2, 100, 20, 12, 214), 2);
  let t = 0;
  const rows = [['Waktu bertahan', formatTime(res.time), 'time'], ['Kill', res.kills, 'kills'], ['Level', res.level, 'level']];
  return {
    update(input) { t += STEP; return ACTIONS[b.update(input)] ?? null; },
    draw(ctx) {
      dim(ctx);
      const k = ease(t / 0.35);                                  // the verdict drops in
      title(ctx, assets, res.won ? 'MENANG!' : 'KALAH', 18 - Math.round((1 - k) * 20), 5, res.won ? 'y' : 'r');
      const px = W / 2 - 110, py = 70;
      assets.drawSlice(ctx, 'card', px, py, 220, 124, 5);
      rows.forEach(([label, v, key], n) => {
        const y = py + 12 + n * 20;
        drawText(ctx, assets, label, px + 12, y + 3, { color: 'x' });
        drawText(ctx, assets, String(v), px + 112, y, { scale: 2 });
        if (res.newBest.includes(key)) drawText(ctx, assets, 'Rekor baru!', px + 208, y + 3, { color: Math.floor(t * 3) % 2 ? 'w' : 'g', align: 'right' });
      });
      const fusions = res.fusions ?? [], found = res.found ?? [], uy = py + 12 + 3 * 20;
      drawText(ctx, assets, 'Fusion', px + 12, uy + 3, { color: 'x' });
      if (!fusions.length) drawText(ctx, assets, '-', px + 112, uy + 3, { color: 'x' });
      fusions.forEach((id, n) => {
        const cx = px + 119 + n * 22;
        assets.drawSlice(ctx, 'slot_lit', px + 110 + n * 22, uy - 4, 18, 18, 2);
        assets.draw(ctx, 'icon_' + id, cx, uy + 5);
        if (found.includes(id)) drawText(ctx, assets, 'Baru!', cx, uy + 15, { color: Math.floor(t * 3) % 2 ? 'w' : 'g', align: 'center' });
      });
      wrapText(fusions.map(id => NAMES[id].name).join(', '), 200).slice(0, 2).forEach((l, k) => drawText(ctx, assets, l, W / 2, uy + 25 + k * 8, { color: 'y', align: 'center' }));
      b.draw(ctx);
    },
  };
}
