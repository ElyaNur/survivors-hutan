import { test } from 'node:test'; import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { textWidth, wrapText } from '../src/engine/font.js';
import { layoutCards, cardAt, cardInfo, levelUpScreen, starterPickScreen, bookScreen } from '../src/ui/screens.js';
import { formatTime, updateBanner } from '../src/ui/hud.js';
import { CLASSES, NAMES } from '../src/data/classes.js';
import { createRun } from '../src/game/run.js';

const mage = CLASSES.mage;

test('textWidth: 3px glyphs + 1px gap, narrow punctuation, scale', () => {
  assert.equal(textWidth(''), 0);
  assert.equal(textWidth('A'), 3);
  assert.equal(textWidth('Lv 2'), 15);
  assert.equal(textWidth('Baru!'), 4 * 4 + 1);
  assert.equal(textWidth('★ A'), 5 + 1 + 3 + 1 + 3);
  assert.equal(textWidth('AB', 2), 14);
});

test('font widths match the built ui sheet (ink = frame - 2px outline)', () => {
  const frames = JSON.parse(readFileSync(new URL('../art/out/ui.json', import.meta.url))).frames;
  for (let c = 33; c <= 126; c++) {
    const ch = String.fromCharCode(c);
    assert.equal(textWidth(ch), frames['glyph_' + c].frame.w - 2, `glyph ${JSON.stringify(ch)}`);
  }
  for (const ch of ['★', '→']) assert.equal(textWidth(ch), frames['glyph_' + ch.codePointAt(0)].frame.w - 2, ch);
});

test('wrapText keeps every line within maxW and loses no words', () => {
  const s = 'Meteor jatuh ke area musuh setelah peringatan singkat, lalu membakar.';
  const lines = wrapText(s, 104);
  assert.ok(lines.length >= 2);
  for (const l of lines) assert.ok(textWidth(l) <= 104, l);
  assert.equal(lines.join(' '), s);
});

test('layoutCards centres rows; cardAt hit-tests them', () => {
  const r = layoutCards(3, 3, 120, 100, 12, 90);
  assert.deepEqual(r[0], { x: 48, y: 90, w: 120, h: 100 });
  assert.equal(r[2].x + r[2].w, 480 - 48);
  const six = layoutCards(6, 3, 120, 84, 8, 50);
  assert.equal(six[3].y, 50 + 84 + 8);
  assert.equal(six[3].x, six[0].x);
  assert.equal(cardAt(r, 48, 90), 0);
  assert.equal(cardAt(r, 48 + 120 + 12 + 5, 120), 1);
  assert.equal(cardAt(r, 48 + 120 + 3, 120), -1, 'gap between cards');
  assert.equal(cardAt(r, 300, 10), -1);
});

test('cardInfo: level line and ★ recipe tags, hidden until discovered', () => {
  const build = { skills: { fireball: 5, meteor: 4 }, fusions: [] };
  const meteor = cardInfo({ kind: 'skill', id: 'meteor', nextLevel: 5 }, mage, build);
  assert.equal(meteor.level, 'Lv 4→5');
  assert.deepEqual(meteor.tags, [{ text: '★ ???', unlocks: true }]);
  assert.deepEqual(cardInfo({ kind: 'skill', id: 'meteor', nextLevel: 5 }, mage, build, new Set(['hujanNeraka'])).tags, [{ text: '★ Hujan Neraka', unlocks: true }]);
  const ice = cardInfo({ kind: 'skill', id: 'iceShard', nextLevel: 1 }, mage, build);
  assert.equal(ice.level, 'Baru!');
  assert.deepEqual(ice.tags.map(t => t.text), ['★ ???', '★ ???'], 'one tag per other held skill');
  assert.ok(ice.tags.every(t => !t.unlocks));
  assert.equal(cardInfo({ kind: 'skill', id: 'meteor', nextLevel: 5 }, mage, { skills: { meteor: 4, arcaneOrb: 5 }, fusions: [] }, new Set(['lubangHitam'])).tags[0].text, '★ Lubang Hitam');
  assert.deepEqual(cardInfo({ kind: 'passive', id: 'magnet', nextLevel: 2 }, mage, build).tags, []);
  assert.equal(cardInfo({ kind: 'heal' }, mage, build).name, 'Isi HP');
});

test('cardInfo: fusion card is ??? until discovered', () => {
  const build = { skills: { meteor: 5, arcaneOrb: 5 }, fusions: [] }, card = { kind: 'fusion', id: 'lubangHitam', a: 'meteor', b: 'arcaneOrb' };
  assert.deepEqual(cardInfo(card, mage, build), { icon: 'icon_unknown', name: '???', level: 'Fusion!', desc: 'Meteor + Orb Arcane = ???', tags: [] });
  const seen = cardInfo(card, mage, build, new Set(['lubangHitam']));
  assert.equal(seen.name, NAMES.lubangHitam.name);
  assert.equal(seen.icon, 'icon_lubangHitam');
  assert.equal(seen.desc, `Meteor + Orb Arcane. ${NAMES.lubangHitam.desc}`);
});

test('fusion text fits: names within the banner/card width, hidden descs within 4 lines', () => {
  for (const f of mage.fusions) {
    assert.ok(textWidth(NAMES[f.id].name) <= 76, f.id);
    const desc = cardInfo({ kind: 'fusion', ...f }, mage, { skills: {}, fusions: [] }).desc;
    assert.ok(wrapText(desc, 104).length <= 4, desc);
    assert.ok(wrapText(`${NAMES[f.a].name} + ${NAMES[f.b].name}. ${NAMES[f.id].desc}`, 104).length <= 4, f.id);
  }
});

// Fake input: taps consumed on read like the real one.
function fakeInput() {
  const taps = new Set();
  return { taps, mouse: { x: 0, y: 0, clicked: false }, pressed: c => taps.delete(c) };
}
const steps = (screen, input, n) => { let r = null; for (let i = 0; i < n && !r; i++) r = screen.update(input); return r; };
function levelRun() {
  const run = createRun('mage', 'fireball', 1);
  run.cards = [{ kind: 'skill', id: 'meteor', nextLevel: 1 }, { kind: 'passive', id: 'focus', nextLevel: 1 }, { kind: 'heal' }];
  run.pendingLevelUps = 1; run.state = 'levelup';
  return run;
}

test('level-up screen: number keys pick, but only after the input lock', () => {
  const run = levelRun(), s = levelUpScreen(run, null), inp = fakeInput();
  inp.taps.add('Digit2');
  assert.equal(s.update(inp), null, 'too early');
  steps(s, inp, 30);
  inp.taps.add('Digit2');
  assert.equal(s.update(inp), run.cards[1]);
});

test('level-up screen: arrows + Enter, wrapping', () => {
  const run = levelRun(), s = levelUpScreen(run, null), inp = fakeInput();
  steps(s, inp, 30);
  inp.taps.add('ArrowLeft'); s.update(inp);            // 0 -> 2 (wraps)
  inp.taps.add('Enter');
  assert.equal(s.update(inp), run.cards[2]);
});

test('level-up screen: mouse hover selects, click picks the card under it', () => {
  const run = levelRun(), s = levelUpScreen(run, null), inp = fakeInput();
  steps(s, inp, 30);
  const r = layoutCards(3, 3, 120, 104, 12, 92)[1];
  inp.mouse.x = r.x + 10; inp.mouse.y = r.y + 10; s.update(inp);
  assert.equal(s.picker.sel, 1);
  inp.mouse.clicked = true;
  assert.equal(s.update(inp), run.cards[1]);
  inp.mouse.x = 2; inp.mouse.y = 2;
  assert.equal(s.update(inp), null, 'click outside the cards');
});

test('starter pick: 6 skills, arrow down moves a row, returns the skill id', () => {
  const s = starterPickScreen(mage, null), inp = fakeInput();
  steps(s, inp, 30);
  inp.taps.add('ArrowDown'); inp.taps.add('ArrowRight'); s.update(inp);
  assert.equal(s.picker.sel, 4);
  inp.taps.add('Digit6');
  assert.equal(s.update(inp), 'arcaneOrb');
});

test('formatTime mm:ss', () => {
  assert.equal(formatTime(0), '00:00');
  assert.equal(formatTime(65.9), '01:05');
  assert.equal(formatTime(1200), '20:00');
});

test('fusion banner: one at a time from newFusions, 2.5 s each', () => {
  const run = createRun('mage', 'fireball', 1);
  run.newFusions.push({ id: 'hujanNeraka', first: true }, { id: 'absoluteZero', first: false });
  updateBanner(run, 0.016);
  assert.equal(run.banner.id, 'hujanNeraka');
  assert.equal(run.banner.first, true);
  assert.deepEqual(run.newFusions, [{ id: 'absoluteZero', first: false }], 'shown entries are cleared');
  updateBanner(run, 2.4);
  assert.equal(run.banner.id, 'hujanNeraka');
  updateBanner(run, 0.2);
  assert.equal(run.banner.id, 'absoluteZero');
  updateBanner(run, 2.6);
  assert.equal(run.banner, null);
});

test('pause: Menyerah needs a second press (a refocus click alone never forfeits)', async () => {
  const { pauseScreen } = await import('../src/ui/screens.js');
  const stub = () => { const taps = new Set(); return { taps, mouse: { x: 0, y: 0, clicked: false }, pressed: c => taps.delete(c) }; };
  const step = (s, inp, n = 1) => { let a = null; for (let i = 0; i < n && !a; i++) { a = s.update(inp); inp.mouse.clicked = false; } return a; };
  const p = pauseScreen(null), inp = stub();
  step(p, inp, 30);                                          // past the input lock
  Object.assign(inp.mouse, { x: 240, y: 150, clicked: true });   // the click that refocuses the window, on Menyerah
  assert.equal(step(p, inp), null, 'first click only arms');
  inp.mouse.clicked = true;
  assert.equal(step(p, inp), 'forfeit', 'second click confirms');
  const q = pauseScreen(null), k = stub();
  step(q, k, 30);
  k.taps.add('Digit2'); assert.equal(step(q, k), null);
  k.taps.add('ArrowUp'); step(q, k);                          // moving off Menyerah disarms it
  k.taps.add('Digit2'); assert.equal(step(q, k), null);
  k.taps.add('Enter'); assert.equal(step(q, k), 'forfeit');
  k.taps.add('Escape'); assert.equal(step(pauseScreen(null), k), 'resume');
});

test('Buku Resep: counts discoveries, Esc and the 16th item go back, a slot does nothing', () => {
  const stub = () => { const taps = new Set(); return { taps, mouse: { x: 0, y: 0, clicked: false }, pressed: c => taps.delete(c) }; };
  const run = (s, inp, n) => { let a = null; for (let i = 0; i < n && !a; i++) a = s.update(inp); return a; };
  const s = bookScreen(null, mage, { fusions: { lubangHitam: { made: 2, wins: 1 } } });
  assert.equal(s.found, 1);
  assert.equal(bookScreen(null, mage, { bestTime: 5, wins: 1 }).found, 0);   // v1 record
  assert.equal(bookScreen(null, mage, undefined).found, 0);
  const inp = stub();
  assert.equal(run(s, inp, 30), null);                                         // idle past the input lock
  inp.taps.add('Enter'); assert.equal(s.update(inp), null);                    // Enter on slot 0 (a slot, not Kembali)
  assert.equal(inp.taps.size, 0);                                              // the tap was read, not ignored
  inp.taps.add('Escape'); assert.equal(s.update(inp), 'back');
  for (let i = 0; i < 15; i++) { inp.taps.add('ArrowRight'); s.update(inp); }  // slot 15 = Kembali
  inp.taps.add('Enter'); assert.equal(s.update(inp), 'back');
});
