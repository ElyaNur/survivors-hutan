# Portrait Phone Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On a phone, the game runs at a portrait 270×480 view: a simpler play HUD, stacked cards, and the build info moved to the pause screen. Desktop stays 480×270 and unchanged.

**Architecture:** A new `src/engine/view.js` holds the one mutable view size, `VIEW = { w, h, portrait }`, defaulting to landscape 480×270 (so node tests and `scripts/sim.js` are unaffected). `main.js` picks the mode once at load (coarse pointer or `?portrait`) before the first run or screen is built. Every module that hard-codes 480/270 reads `VIEW.w/VIEW.h` at call time instead; everything that already uses `camera().w/h` follows on its own. HUD and screens branch on `VIEW.portrait` only where the layout differs.

**Tech Stack:** Unchanged: plain ES modules, Canvas 2D, `node --test`, python3 http.server.

**Spec:** `docs/superpowers/specs/2026-10-18-portrait-phone-design.md` (with mockup screenshots in `docs/superpowers/specs/portrait-mockups/`). Read it first.

## Global Constraints

- No dependencies. Player-facing text in Bahasa Indonesia. New tunables go in `src/data/tuning.js`, never inside the `fusions` block.
- **Do not edit** `src/data/spawns.js`, the `fusions` block of `src/data/tuning.js`, `src/logic/progression.js`, `scripts/sim.js` (balance pass on `feat/fusion`). Edits to `src/game/skills/fusions/*.js` are limited to replacing the hard-coded view size: no behaviour or number changes.
- Portrait view is **270×480**; landscape **480×270**. The mode is fixed for the page's lifetime.
- **Desktop must look and behave exactly as today.** Existing tests must keep passing untouched.
- Phone keeps portrait when turned sideways: the canvas stays 270×480, scaled to fit, letterboxed.
- Portrait scale is fractional (`Math.min(innerWidth / w, innerHeight / h)`). Desktop keeps today's integer-when-it-fits rule.
- Pixel-art look only: `drawText`, `drawSlice`, sprites, `fillRect`. No anti-aliased arcs, no CSS stretching beyond the canvas scale.
- Commit on this worktree's branch only.

## Review Focus

1. **Phone turned sideways:** the game stays upright and letterboxed. A thumb on the black bars still starts the stick. A tap on the bars never picks a card or button. Pinned in Task 2 (browser check, step 6).
2. **Longest strings in the narrower portrait layouts** (for example "Penghakiman Langit", or "Fireball + Petir Berantai = ???" on a 242-wide card, in an 84-wide book slot, or in the banner): no overflow. Pinned in Task 4 (`portrait text fits`) and Task 3 (`banner fits`).
3. **Pause screen with a full build** (4 skills with up to 6 possible pairs, or with fusions already in slots): at most 3 fusion rows and everything fits inside the panel. Pinned in Task 5.
4. **Desktop regression:** landscape camera, rects and HUD are unchanged. Pinned in Task 1 (`landscape camera unchanged`) and by the existing `test/ui.test.js`.
5. **Boss fight in portrait:** the boss bar fits the width and does not overlap the timer or the pause button. Pinned in Task 3 (`boss bar rect`).

## Model per task (CLAUDE.md)

Task 1 sonnet · Task 2 sonnet · Task 3 sonnet · Task 4 opus (layouts are what the owner judges) · Task 5 sonnet · Task 6 verification sonnet · final branch review opus.

---

## File map

| File | Change |
|---|---|
| `src/engine/view.js` | **new**: `VIEW`, `setPortrait(on)` |
| `src/game/world.js` | `camera()` uses `VIEW` |
| `src/game/skills/fusions/index.js`, `absoluteZero.js`, `hujanNeraka.js` | hard-coded 480/270 → `VIEW` / `cam` |
| `src/main.js` | mode pick, canvas size, scaling, HUD/screen calls |
| `src/engine/input.js` | pointer listeners on `window`; clicks only inside the canvas |
| `src/data/tuning.js` | `touch.pause` becomes right-anchored |
| `src/ui/hud.js` | portrait HUD; exports `fusionPairs`, `slot`, `bossBarRect`, `pauseRect` |
| `src/ui/screens.js` | portrait layouts and hints; screens expose `rects`; portrait pause screen |
| `test/view.test.js` | **new** |
| `test/portrait.test.js` | **new** (HUD + screens in portrait) |

---

### Task 1: One view size

**Files:**
- Create: `src/engine/view.js`, `test/view.test.js`
- Modify: `src/game/world.js:6,19-23`, `src/game/skills/fusions/index.js:24,37-40`, `src/game/skills/fusions/absoluteZero.js:8,46`, `src/game/skills/fusions/hujanNeraka.js:9,15,44-45`

**Interfaces:**
- Produces: `export const VIEW = { w: 480, h: 270, portrait: false }` and `export function setPortrait(on: boolean): void` (sets `portrait`, then `w/h` to 270/480 or 480/270). Every later task reads `VIEW.w`, `VIEW.h` and `VIEW.portrait` **at call time**. Never copy them into a module-level const.

- [ ] **Step 1: Write the failing tests** in `test/view.test.js`:

```js
import { test, after } from 'node:test'; import assert from 'node:assert/strict';
import { VIEW, setPortrait } from '../src/engine/view.js';
import { camera, WORLD_W, WORLD_H } from '../src/game/world.js';
after(() => setPortrait(false));

test('view defaults to landscape 480x270', () => {
  assert.deepEqual(VIEW, { w: 480, h: 270, portrait: false });
});
test('landscape camera unchanged', () => {
  assert.deepEqual(camera({ x: 960, y: 540 }), { x: 720, y: 405, w: 480, h: 270 });
  assert.deepEqual(camera({ x: 0, y: 0 }), { x: 0, y: 0, w: 480, h: 270 });
});
test('portrait camera: 270x480, centred, clamped to the world', () => {
  setPortrait(true);
  assert.deepEqual(VIEW, { w: 270, h: 480, portrait: true });
  assert.deepEqual(camera({ x: 960, y: 540 }), { x: 825, y: 300, w: 270, h: 480 });
  assert.deepEqual(camera({ x: WORLD_W, y: WORLD_H }), { x: WORLD_W - 270, y: WORLD_H - 480, w: 270, h: 480 });
  setPortrait(false);
  assert.equal(camera({ x: 960, y: 540 }).w, 480);
});
```

- [ ] **Step 2: Run** `node --test test/view.test.js`. Expected: FAIL, because `view.js` does not exist yet.
- [ ] **Step 3: Implement** `view.js`, and make `camera()` read `VIEW.w/VIEW.h` (delete `VIEW_W/VIEW_H`). In the three fusion files, replace the constants: `overlay(ctx, color, alpha, h = VIEW.h, blend)` fills `VIEW.w + 2 * PAD`. `absoluteZero` bounds use the `cam` passed to its draw. In `hujanNeraka`, the full-height band becomes `cam.h` at draw time (`SKY_BANDS` keeps only the 90 and 36 bands, plus one `[cam.h, 0.1]` built in draw), and `overlay(..., cam.h, 'multiply')`.
- [ ] **Step 4: Run** `npm test`. Expected: every test passes, the new ones included.
- [ ] **Step 5: Commit** with `refactor: one mutable view size (VIEW), camera and fusion overlays read it`.

### Task 2: Pick the mode, size and scale the canvas, input on the whole screen

**Files:**
- Modify: `src/main.js:13-26,101`, `src/engine/input.js`, `src/data/tuning.js` (the `touch` line only), `src/ui/hud.js` (`pauseHit` only), `test/portrait.test.js` (new)

**Interfaces:**
- Consumes: `VIEW`, `setPortrait` (Task 1).
- Produces:
  - `TUNING.touch.pause = { right: 22, y: 20, size: 18, pad: 8 }`, whose x is `VIEW.w - right` (458 in landscape, as today).
  - `export const pauseRect = () => ({ x, y, w: size, h: size })` and `pauseHit(m)` in `hud.js`. Task 3 draws the button with `pauseRect()`.
  - `initInput(canvas)` behaviour:
    - `pointermove`, `pointerdown`, `pointerup` and `pointercancel` are listened on `window`.
    - A touch anywhere on the screen can start the stick.
    - `mouse.clicked` is set only when the mapped point lies inside `0..VIEW.w × 0..VIEW.h`.
    - `toInternal` maps with `canvas.width/height`, which equal `VIEW.w/h`.

- [ ] **Step 1: Write the failing test** in `test/portrait.test.js` (this file grows in Tasks 3–5; reset with `after(() => setPortrait(false))`):

```js
test('pause button is right-anchored: same spot in landscape, top-right in portrait', () => {
  assert.deepEqual(pauseRect(), { x: 458, y: 20, w: 18, h: 18 });
  setPortrait(true);
  assert.deepEqual(pauseRect(), { x: 248, y: 20, w: 18, h: 18 });
  assert.ok(pauseHit({ x: 252, y: 24 }) && !pauseHit({ x: 200, y: 24 }));
  setPortrait(false);
});
```

- [ ] **Step 2: Run** `node --test test/portrait.test.js`. Expected: FAIL, because `pauseRect` is not exported.
- [ ] **Step 3: Implement.**
  - In `main.js`, before `createRun` and `go('menu')`: `setPortrait(new URLSearchParams(location.search).has('portrait') || matchMedia('(pointer: coarse)').matches)`. Then set `canvas.width = VIEW.w; canvas.height = VIEW.h`. Because these properties reset the context, set `ctx.imageSmoothingEnabled = false` after them.
  - `resize()` uses `VIEW.w/h`, with a fractional fit in portrait.
  - Replace main.js's `W/H` with `VIEW`.
  - In `input.js`, move the listeners to `window` and add the inside-the-view check for `clicked`. The `contextmenu` listener stays on the canvas.
- [ ] **Step 4: Run** `npm test`. Expected: all pass.
- [ ] **Step 5: Browser check: landscape.** On desktop at `http://127.0.0.1:<port>/`, the game looks exactly as before. The mouse works through the menus and Esc pauses.
- [ ] **Step 6: Browser check: portrait.**
  - Use Playwright, a context with `isMobile, hasTouch`, and CDP `Input.dispatchTouchEvent`.
  - **Upright, 390×844:** the canvas is 270×480 internal, scaled about 1.44×, and fills the width.
  - **Turned sideways, 844×390:** the canvas is still upright, letterboxed with bars at the sides.
  - A touch-drag that starts on a black bar moves the mage.
  - A tap on a black bar picks nothing.
  - Screens may look broken until Tasks 3–5; only the canvas, scale and input are checked here.
- [ ] **Step 7: Commit** with `feat: portrait 270x480 on touch devices (or ?portrait), whole-screen touch input`.

### Task 3: Portrait play HUD

**Files:**
- Modify: `src/ui/hud.js`, `test/portrait.test.js`

**Interfaces:**
- Consumes: `VIEW` and `pauseRect()` (Tasks 1–2).
- Produces:
  - `export function fusionPairs(run): Array<{ f, a, b, lit: boolean }>`: the held pairs that can fuse, closest first (by level sum), at most 3. This is today's `drawFusionPanel` selection pulled out; `drawFusionPanel` uses it.
  - `export function slot(ctx, assets, x, y, iconName, lv = 0, lit = false)`: unchanged body, now exported for Task 5.
  - `export const bossBarRect = () => ({ x, y, w, h: 8 })`:
    - landscape: `{ x: 140, y: 32, w: 200, h: 8 }`, exactly today's;
    - portrait: `w = 200`, centred, `y = 44`, so it sits under the top row and the pause button.

- [ ] **Step 1: Write the failing tests** in `test/portrait.test.js`:

```js
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
test('banner fits portrait: every fusion title fits at the portrait banner scale', () => {
  for (const f of mage.fusions) assert.ok(textWidth(`FUSION BARU: ${NAMES[f.id].name}!`, 1) <= 270 - 2 * 24 - 20, f.id);
});
```

  First check the actual fusable pairs in `CLASSES.mage.fusions`. If fireball + meteor is not a fusion, pick two that are and set both to 5.

- [ ] **Step 2: Run** `node --test test/portrait.test.js`. Expected: FAIL, because the exports are missing.
- [ ] **Step 3: Implement** in `hud.js`:
  - Replace `W/H` with `VIEW`, read inside functions.
  - In portrait, `drawHud` skips `drawBuild` and `drawFusionPanel`.
  - Draw the boss bar from `bossBarRect()`, with its name 8 px above.
  - Banner in portrait: title at scale 1, description wrapped to the banner width, banner height grown to fit.
  - `drawTouch` draws the pause button at `pauseRect()`.
- [ ] **Step 4: Run** `npm test`. Expected: all pass.
- [ ] **Step 5: Commit** with `feat: portrait HUD (no build/fusion panels), narrower boss bar and banner`.

### Task 4: Portrait screens (menus, cards, book, result)

**Files:**
- Modify: `src/ui/screens.js`, `test/portrait.test.js`

**Interfaces:**
- Consumes: `VIEW` (Task 1).
- Produces:
  - Every screen object returned by `menuScreen`, `classSelectScreen`, `recordsScreen`, `bookScreen`, `levelUpScreen`, `starterPickScreen`, `pauseScreen` and `resultScreen` gains `rects`: its tappable rects in picker order. Task 5 and the tests rely on it.
  - `layoutCards` centres on `VIEW.w`.

Portrait layouts. These are the spec's calls; the numbers are a starting point, and the tests are what bind:

| Screen | Portrait layout |
|---|---|
| level-up | `layoutCards(n, 1, 242, 100, 8, 86)`; full card content as desktop; title and sub above |
| starter pick | `layoutCards(6, 2, 125, 84, 8, 80)` |
| main menu | title `SURVIVORS` / `HUTAN` on two lines at scale 4; tagline wrapped; `layoutCards(4, 1, 140, 22, 6, 300)` |
| class select | `layoutCards(3, 2, 128, 150, 8, 54)` |
| records | same class rects (h 154); Kembali at `y = 440` |
| Buku Resep | 15 slots `layoutCards(15, 3, 84, 38, 4, 38)`; detail panel `x 12, w 246` under the grid; Kembali at `y = 440` |
| result | today's layout shifted down by `(VIEW.h - 270) / 2` (fits 270 wide already) |
| pause | Task 5 |

Hints in portrait speak touch and drop keys and Esc:
- card screens: `Ketuk kartu untuk memilih`;
- menus: `Ketuk untuk memilih`;
- class select, records and book: `Ketuk Kembali untuk keluar` (where there is a Kembali). Class select has none, so add a `Kembali` button under its cards in portrait, rect last, returning `'back'`.

- [ ] **Step 1: Write the failing tests** in `test/portrait.test.js`:

```js
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
test('portrait class select: Kembali is tappable and returns back', () => { /* tap the last rect after the lock -> 'back' */ });
test('portrait text fits: card descs, book names, menu title', () => {
  for (const f of mage.fusions) assert.ok(textWidth(NAMES[f.id].name) <= 84 - 6, f.id);
  assert.ok(textWidth('SURVIVORS', 4) <= 270 - 16);
  // every skill/passive/fusion card desc wraps to <= 6 lines at 242 - 16
});
test('landscape rects unchanged', () => {
  assert.deepEqual(levelUpScreen(levelRun(), null).rects, layoutCards(3, 3, 120, 104, 12, 92));
});
```

  Implement the `Kembali` test body with the existing `fakeInput` and `steps` helpers from `test/ui.test.js`; copy them into the file. `levelRun` is copied the same way.

- [ ] **Step 2: Run** `node --test test/portrait.test.js`. Expected: FAIL, because there are no `rects` and the layouts are still landscape.
- [ ] **Step 3: Implement** the layouts in `screens.js`:
  - Replace `W/H` with `VIEW`, read at call time. Rects are computed when the screen is built.
  - The title helper caches per string, so the two-line menu title is two cached draws.
  - Text positions follow their rects.
- [ ] **Step 4: Run** `npm test`. Expected: all pass, including the untouched `test/ui.test.js`.
- [ ] **Step 5: Look at every portrait screen** at `?portrait` in a 390×844 viewport. Compare against `docs/superpowers/specs/portrait-mockups/levelup.png`.
  - No text overflows a card.
  - Nothing is clipped at the edges.
  - It reads as designed for portrait, not squeezed.
  - Fix and repeat until clean.
- [ ] **Step 6: Commit** with `feat: portrait layouts for menus, cards, book, records, result; touch hints`.

### Task 5: Portrait pause screen with the build

**Files:**
- Modify: `src/ui/screens.js` (`pauseScreen`; it gains a `run` parameter), `src/main.js:67` (`pauseScreen(assets, run)`), `test/portrait.test.js`, `test/ui.test.js` only if the signature change requires it (keep the old tests passing; `run` is unused in landscape)

**Interfaces:**
- Consumes: `fusionPairs(run)` and `slot(...)` from `hud.js` (Task 3), plus `rects` (Task 4).
- Produces: `pauseScreen(assets, run)`.
  - **Landscape:** unchanged.
  - **Portrait,** following `docs/superpowers/specs/portrait-mockups/pause.png`:
    - a panel `x 10, y 40, w 250, h 400`;
    - `JEDA` at scale 3;
    - a `Skill` label with 4 slots (skills, then the fusions in their slots, lit, as `drawBuild` does);
    - a `Pasif` label with 4 slots, all with pips;
    - a `Fusion yang bisa dibuat` label, then up to 3 `fusionPairs` rows. Each row: A + B → result (`icon_unknown` until discovered), with the ingredient names and the fusion name (or `???`) as text. A lit row says `siap!`;
    - none of the fusion section when there are no pairs;
    - `Lanjut` / `Menyerah` as `layoutCards(2, 1, 110, 20, 8, 360)`, with Menyerah keeping its two-tap confirm.

- [ ] **Step 1: Write the failing tests** in `test/portrait.test.js`:

```js
test('portrait pause: buttons fit, Menyerah still asks twice, full build fits the panel', () => {
  setPortrait(true);
  const run = createRun('mage', 'fireball', 1);
  run.build.skills = { fireball: 5, meteor: 5, iceShard: 5, frostNova: 5 }; run.build.passives = { focus: 5, swiftness: 2, magnet: 1, vitality: 3 };
  const p = pauseScreen(null, run);
  assert.equal(p.rects.length, 2); p.rects.forEach(r => assert.ok(inside(r)));
  assert.ok(fusionPairs(run).length <= 3);
  // two presses on rect 1 -> 'forfeit', one -> null (same pattern as the landscape test in ui.test.js)
  setPortrait(false);
});
```

  Use real fusable pairs from `CLASSES.mage.fusions`, as in Task 3.

- [ ] **Step 2: Run** `node --test test/portrait.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** the portrait branch of `pauseScreen` and pass `run` from `main.js`.
- [ ] **Step 4: Run** `npm test`. Expected: all pass.
- [ ] **Step 5: Look at it in the browser.**
  - Use `?portrait&debug`, start a run, press F3 (all skills to Lv5) and F2, pick cards to fill the build, then tap pause.
  - Compare with `pause.png`.
  - Check an empty build (right after the start) and a build with a fusion (F5).
- [ ] **Step 6: Commit** with `feat: portrait pause screen shows the build and fusion pairs`.

### Task 6: Verify end to end, and hand over

- [ ] **Step 1:** Run `npm test`. All must pass.
- [ ] **Step 2: Phone upright** (Playwright mobile context 390×844, touch, CDP touch events):
  - menu → class → starter → play;
  - move with the stick;
  - level-up pick by tap;
  - pause shows the build, Lanjut resumes;
  - debug F8 (jump to 19:50) to see the treant with its boss bar;
  - forfeit, then the result screen, then Main lagi.
  - Screenshot each screen.
- [ ] **Step 3: Phone turned sideways** (844×390): the game is upright and letterboxed, and the stick works from a bar.
- [ ] **Step 4: Desktop** (1000×600, no touch): every screen matches today. Compare screenshots against the same screens on commit `2786a06`, served from a temporary `git worktree`. Expect identical layouts; only animation timing may differ.
- [ ] **Step 5:** Send the owner the phone screenshots. Note anything that feels unfair in portrait (enemies from the sides, bat ring pop-in) **for the balance pass**; do not retune here.
- [ ] **Step 6: Final commit** (if anything changed), with a short "Verified:" note in the message saying how it was checked.
