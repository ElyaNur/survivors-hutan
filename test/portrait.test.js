import { test, after } from 'node:test'; import assert from 'node:assert/strict';
import { setPortrait } from '../src/engine/view.js';
import { pauseRect, pauseHit, fusionPairs, bossBarRect, bannerInnerW, bannerDescLines } from '../src/ui/hud.js';
import { createRun } from '../src/game/run.js';
import { CLASSES, NAMES, PASSIVES } from '../src/data/classes.js';
import { textWidth, wrapText } from '../src/engine/font.js';
import { layoutCards, cardInfo, levelUpScreen, starterPickScreen, menuScreen, classSelectScreen, recordsScreen, bookScreen, pauseScreen, resultScreen, PAUSE_TEXT_X, PAUSE_TEXT_W } from '../src/ui/screens.js';
const mage = CLASSES.mage;
after(() => setPortrait(false));

test('pause button is right-anchored: same spot in landscape, top-right in portrait', () => {
  assert.deepEqual(pauseRect(), { x: 458, y: 20, w: 18, h: 18 });
  setPortrait(true);
  assert.deepEqual(pauseRect(), { x: 248, y: 20, w: 18, h: 18 });
  assert.ok(pauseHit({ x: 252, y: 24 }) && !pauseHit({ x: 200, y: 24 }));
  setPortrait(false);
});

test('fusionPairs: closest first, at most 3, lit only at 5+5', () => {
  const run = createRun('mage', 'fireball', 1);
  run.build.skills = { fireball: 5, meteor: 5, iceShard: 3, frostNova: 2 };   // 4 skills: several fusable pairs
  const pairs = fusionPairs(run);
  assert.ok(pairs.length <= 3 && pairs.length > 0);
  assert.equal(pairs[0].lit, true);
  for (let i = 1; i < pairs.length; i++) assert.ok(!pairs[i].lit);
});
test('boss bar rect: landscape as today; portrait inside the view, clear of the pause button and timer row', () => {
  assert.deepEqual(bossBarRect(), { x: 140, y: 32, w: 200, h: 8 });
  setPortrait(true);
  const b = bossBarRect(), p = pauseRect();
  assert.ok(b.x >= 0 && b.x + b.w <= 270 && b.y > p.y + p.h - 2 && b.y > 26);
  setPortrait(false);
});
test('banner fits portrait: every wrapped description line and the title sit inside the frame art', () => {
  setPortrait(true);
  const inner = bannerInnerW();
  for (const f of mage.fusions) {
    for (const l of bannerDescLines(f.id)) assert.ok(textWidth(l) / 2 <= 270 / 2 - (24 + 8) - 4, `${f.id}: ${l}`);   // centred on the banner, 4 px of air inside the 8 px edge
    // title is centred at w/2 + 10 with the icon 14 px left of it
    const tw = textWidth(`FUSION BARU: ${NAMES[f.id].name}!`), c = 270 / 2 + 10;
    assert.ok(c + tw / 2 <= 24 + 8 + inner && c - tw / 2 - 14 - 8 >= 24 + 8, f.id);
  }
  setPortrait(false);
});

// Fake input and run, as in ui.test.js: taps consumed on read like the real one.
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
const inside = r => r.x >= 0 && r.y >= 0 && r.x + r.w <= 270 && r.y + r.h <= 480;
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
test('portrait: every screen\'s tappable rects fit 270x480 and never overlap', () => {
  setPortrait(true);
  const screens = { menu: menuScreen(null, () => false), cls: classSelectScreen(null, CLASSES), rec: recordsScreen(null, CLASSES, {}),
    book: bookScreen(null, mage, undefined), lvl: levelUpScreen(levelRun(), null), start: starterPickScreen(mage, null),
    res: resultScreen(null, { won: true, time: 600, kills: 1, level: 9, fusions: [], found: [], newBest: [] }) };
  for (const [name, s] of Object.entries(screens)) {
    assert.ok(s.rects.length > 0, name);
    s.rects.forEach((r, i) => { assert.ok(inside(r), `${name} ${i}`); s.rects.forEach((q, j) => j > i && assert.ok(!overlap(r, q), `${name} ${i}/${j}`)); });
  }
  setPortrait(false);
});
test('portrait class select: Kembali is tappable and returns back', () => {
  assert.equal(classSelectScreen(null, CLASSES).rects.length, 3, 'landscape: no Kembali button');
  setPortrait(true);
  const s = classSelectScreen(null, CLASSES), inp = fakeInput(), k = s.rects.at(-1);
  assert.equal(s.rects.length, 4);
  assert.equal(steps(s, inp, 30), null);                     // idle past the input lock
  Object.assign(inp.mouse, { x: k.x + k.w / 2, y: k.y + k.h / 2, clicked: true });
  assert.equal(s.update(inp), 'back');
  const m = s.rects[0];
  Object.assign(inp.mouse, { x: m.x + m.w / 2, y: m.y + m.h / 2, clicked: true });
  assert.equal(s.update(inp), 'mage', 'a class card still picks its class');
  setPortrait(false);
});
test('portrait text fits: card descs, book names, menu title', () => {
  for (const f of mage.fusions) assert.ok(textWidth(NAMES[f.id].name) <= 82 - 10, f.id);
  assert.ok(textWidth('SURVIVORS', 4) <= 270 - 16);
  const build = { skills: {}, fusions: [] }, cards = [...mage.skills.map(id => ({ kind: 'skill', id, nextLevel: 1 })),
    ...PASSIVES.map(id => ({ kind: 'passive', id, nextLevel: 1 })), ...mage.fusions.map(f => ({ kind: 'fusion', ...f })), { kind: 'heal' }];
  for (const c of cards) for (const seen of [new Set(), new Set([c.id])]) {
    const { desc } = cardInfo(c, mage, build, seen);
    assert.ok(wrapText(desc, 242 - 16).length <= 6, desc);
  }
  for (const f of mage.fusions) assert.ok(wrapText(NAMES[f.id].desc, 246 - 16).length <= 2, f.id);   // the book's detail panel (254 wide; 246 keeps slack)
});
test('landscape rects unchanged', () => {
  assert.deepEqual(levelUpScreen(levelRun(), null).rects, layoutCards(3, 3, 120, 104, 12, 92));
  assert.deepEqual(starterPickScreen(mage, null).rects, layoutCards(6, 3, 120, 84, 8, 50));
  assert.deepEqual(menuScreen(null, () => false).rects, layoutCards(4, 4, 100, 20, 6, 196));
  assert.deepEqual(pauseScreen(null).rects, layoutCards(2, 1, 110, 20, 8, 112));
  assert.deepEqual(resultScreen(null, { fusions: [], newBest: [] }).rects, layoutCards(2, 2, 100, 20, 12, 214));
  assert.deepEqual(bookScreen(null, mage, undefined).rects, [...layoutCards(15, 5, 88, 38, 4, 38), ...layoutCards(1, 1, 100, 20, 0, 216)]);
  assert.deepEqual(recordsScreen(null, CLASSES, {}).rects, layoutCards(1, 1, 100, 20, 0, 216));
});

test('portrait pause: buttons fit, Menyerah still asks twice, fusion text fits the panel', () => {
  setPortrait(true);
  const run = createRun('mage', 'fireball', 1);
  run.build.skills = { fireball: 5, meteor: 5, iceShard: 5, frostNova: 5 }; run.build.passives = { focus: 5, swiftness: 2, magnet: 1, vitality: 3 };
  const p = pauseScreen(null, run);
  assert.equal(p.rects.length, 2); p.rects.forEach(r => assert.ok(inside(r)));
  assert.ok(fusionPairs(run).length <= 3);
  const k = fakeInput(); steps(p, k, 30);                    // past the input lock
  Object.assign(k.mouse, { x: p.rects[1].x + 5, y: p.rects[1].y + 5, clicked: true });
  assert.equal(p.update(k), null);                           // first tap only arms it
  assert.equal(p.update(k), 'forfeit');                      // second confirms
  assert.ok(PAUSE_TEXT_X + PAUSE_TEXT_W <= 260 - 8);         // text column ends inside the panel (x 10..260)
  for (const f of mage.fusions) {                            // the longest row text of every possible fusion
    assert.ok(textWidth(`${NAMES[f.a].name} + ${NAMES[f.b].name}`) <= PAUSE_TEXT_W, f.id);
    assert.ok(textWidth(NAMES[f.id].name + ' siap!') <= PAUSE_TEXT_W, f.id);
  }
  setPortrait(false);
});
