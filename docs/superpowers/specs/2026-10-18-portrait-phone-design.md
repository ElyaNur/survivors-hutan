# Survivors Hutan: portrait phone mode

Date: 2026-10-18. Builds on the touch controls (commit 4ea5606: virtual stick, tap-to-pause, taps on cards and menus).

## Intent

The owner plays on their phone held upright and wants the game to fit that: portrait, and simpler. In their words,
"Gua mau kalau di HP itu tampilannya jadi potrait dan lebih simple gitu". What matters most on the phone is
seeing **the hero and the enemies**. The build information (skill slots, fusion pairs) clutters the small screen
and should move off the play screen.

## Goals

- On a phone the whole game runs in a portrait internal resolution of **270×480**, same pixel-art look as desktop.
- It **stays portrait** even when the phone is turned sideways (owner's decision).
- In-run HUD on the phone (owner chose mockup "A"): xp bar across the top, level (left), timer (centre),
  kill count (right), the touch pause button under the kills, hp bar under the hero. **No** build panel
  (skill + passive slots) and **no** fusion panel on the play screen.
- Level-up (owner chose "A"): the same full cards as desktop (icon, name, level line, description, ★ fusion tags),
  **stacked vertically**, one per row, picked by tap.
- Pause screen on the phone (owner approved the mockup): the JEDA title, then the held **skills and passives**
  as slots with level pips, then the **fusion pairs** the build can make (A + B → result, lit when both are Lv 5,
  result shown as ??? until discovered, same rule as the desktop fusion panel), then Lanjut / Menyerah
  (Menyerah keeps its two-tap confirm).
- Desktop is unchanged: 480×270, same HUD, same layouts.

## Non-goals

- No retuning of spawns, enemy numbers or fusion numbers (a balance pass owns those on branch `feat/fusion`).
  Do not edit `src/data/spawns.js`, the fusion block of `src/data/tuning.js`, `src/logic/progression.js`, `scripts/sim.js`.
- No landscape mode on the phone, no setting to switch modes.
- No new art sheets; reuse the existing ui sprites (`card`, `slot`, `panel`, icons, font).

## Anti-goals (would make it a failure even if it "works")

- Anything that looks cheap ("ampas"): blurry scaling, CSS-stretched pixels, arc-drawn anti-aliased shapes,
  text overflowing a card, layouts that are obviously the landscape screen squeezed.
- Any game-breaking bug: a screen that cannot be left by touch, a card that cannot be picked, a run that cannot
  be paused, desktop behaviour changing.
- A silent gameplay change: if portrait changes how fair the game feels, say so; don't hide a retune in this work.

## Constraints

- Plain ES modules + Canvas 2D, no dependencies, `node:test` tests (`npm test`).
- Player-facing text in Bahasa Indonesia. Tunables (sizes, offsets) in `src/data/tuning.js` (new keys only,
  outside the fusion block).
- Today the view size is hard-coded in several modules: `src/main.js`, `src/game/world.js` (`VIEW_W/VIEW_H`,
  used by `camera()`), `src/ui/hud.js`, `src/ui/screens.js`, `src/game/skills/fusions/index.js`,
  `absoluteZero.js`, `hujanNeraka.js`. All of them must follow the chosen mode.
- The mode is fixed for the page's lifetime (chosen once at load). No mid-run switching.

## Decided by the owner

| Topic | Decision |
|---|---|
| Orientation | Portrait on the phone, and it stays portrait when the phone is turned |
| What must stay visible | Hero and enemies |
| Play HUD | Mockup A: xp bar, Lv, timer, kills, pause button; no build or fusion panel |
| Where build info goes | The pause screen |
| Level-up cards | Full cards (with description), stacked |
| Pause screen | Approved as mocked: skills + passives, fusion pairs, Lanjut / Menyerah |

## Calls I made (owner can overrule)

- **Which devices get portrait:** a device whose primary pointer is coarse (`matchMedia('(pointer: coarse)')`),
  decided at load. Tablets get portrait too. Desktop with a mouse keeps landscape.
- **Phone turned sideways:** the 270×480 canvas stays upright and scales to the screen height, with black bars
  at the sides (the browser cannot lock orientation outside fullscreen, and iOS cannot lock at all).
  No rotate-your-phone nag.
- **Scaling on the phone:** fill the screen (fractional scale = the fit). Today's rule floors to an integer
  when the fit is ≥ 1, which on a 390×844 phone gives 1× and wastes a third of the width. Phones are 2–3×
  DPR, so 1.44 CSS× is ~4.3 device px per game pixel and the unevenness is invisible. Desktop keeps the
  integer rule.
- **Gameplay fairness:** the view is narrower (270 px across vs 480) and taller (480 vs 270). Enemies arriving
  from the sides come into view closer to the hero; from above or below they are visible longer. Spawns are
  keyed to the camera view, so they follow it automatically. Skills and fusions that act "in view" (meteor,
  gletser, kometEs, bolaPlasma, penghakimanLangit, hujanNeraka, medanStatis …) will pick targets in a
  differently shaped area. Ship as is, the owner plays it, and any retune goes through the balance pass. The
  bat ring (`ringRadius: 280`) stays just outside the portrait view's corners (half-diagonal ≈ 275); flag it
  if bats visibly pop in.
- **Other screens in portrait** (not discussed, same style, stacked to fit 270 wide):
  - main menu: title, tagline, buttons in a column;
  - class select: the class cards in a column or a scroll-free tighter grid;
  - starter pick: 6 cards stacked like level-up (shorter, since starters have no level line);
  - Buku Resep: the grid narrower (e.g. 3 wide);
  - records: classes stacked;
  - result: the same panel, narrower;
  - fusion banner: narrower, wrapping the description.
- **Hints in portrait** speak touch: "Ketuk kartu untuk memilih" instead of "1/2/3, panah + Enter, atau klik",
  and the pause hint drops "Esc".
- **Pause-screen fusion rows:** the desktop panel's rule: at most 3 pairs, closest to fusing first. A fusion
  that already replaced its pair shows in the skill slot row, lit, as on the desktop HUD today.
- **Boss bar stays** in portrait (it is about the enemies), narrowed to fit, under the top HUD row.
- **Sideways phone, taps on the black bars:** the stick can start anywhere on the screen (listen on the window,
  not only the canvas); taps that pick cards or buttons only count inside the canvas.
- **Stick radius and pause button:** same `TUNING.touch` knobs; the pause button gets a portrait position. The
  stick radius stays 24 internal px (a larger physical drag at the bigger phone scale); tune it after the
  owner plays.
- **Keyboard still works in portrait** (harmless, useful for testing on desktop with `?portrait` or similar).

## Left to the builder

- How the view size flows to the modules: one source of truth set before the game modules read it, or
  passed in. The hard-coded constants listed above all go.
- Exact pixel layouts of every portrait screen, within the mockups and the anti-goals.
- A desktop way to force portrait for testing (e.g. a `?portrait` URL flag).
- Tests: layout functions that are pure (card rects for 270 wide, HUD positions) get `node:test` coverage. The
  existing layout tests keep passing for landscape.

## Done

- On a phone held upright: every screen fits 270×480 and is usable by touch alone, from the menu through a run
  (move, level-up picks, pause with build info, forfeit, result) and back.
- Phone turned sideways: still the portrait game, upright, letterboxed.
- Desktop: pixel-identical to today in every screen.
- `npm test` green. Verified in a mobile-emulated browser (portrait and turned) and on desktop. Ideally also on
  the owner's phone over LAN.

## Mockups

Screenshots of what the owner saw, in `docs/superpowers/specs/portrait-mockups/`: `hud.png` (A chosen),
`levelup.png` (A chosen), `pause.png` (approved; the mockup's empty space between the fusion rows and the buttons
is not a requirement). They are CSS wireframes with real sprites: they fix what is on each screen and roughly
where, not exact pixels.
