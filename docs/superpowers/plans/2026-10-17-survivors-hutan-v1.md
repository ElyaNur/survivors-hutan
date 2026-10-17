# Survivors Hutan v1 (Mage) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A browser survivors game: one class (Mage), one map (Hutan Cerah), 20-minute runs, auto-attacking skills, and recipe ultimates. All art is made with claude-pxl.

**Architecture:** Static site using plain ES modules and Canvas 2D, with no bundler and no runtime dependencies. Pure logic lives in `src/logic/` and `src/data/`, has no DOM, and is unit-tested with `node --test`. Game objects, rendering and UI live in `src/game/`, `src/engine/` and `src/ui/`, and are verified by playing in the browser. Art sources are `art/*.px.js`, built by pxl into `art/out/<sheet>.png` and `art/out/<sheet>.json`, which the game loads at runtime.

**Tech Stack:** HTML5 Canvas 2D, JavaScript ES modules, Node 24 (`node:test`, pxl), Python 3 `http.server` (dev server) and `zipfile` (release zip). No npm dependencies.

**Spec:** `docs/superpowers/specs/2026-10-17-survivors-hutan-design.md`. Read it before any task. The section numbers below (§N) refer to it.

## Global Constraints

- Browser only, no backend. The release is a static folder zipped for itch.io (§3, §15).
- No framework, no bundler, no runtime dependency. `package.json` exists only for `"type": "module"` and scripts.
- Internal resolution is **480×270**, scaled up with `image-rendering: pixelated`, letterboxed (§3). Use an integer scale when the window fits; otherwise use the largest fractional scale ≥ 0.5.
- All gameplay numbers live in `src/data/tuning.js`. Logic files import from it and never hard-code stats (§10).
- **All player-facing text is in Bahasa Indonesia** (§8).
- Controls: WASD/arrows to move, Esc to pause. Everything else is automatic (§4).
- Mage: pick 1 of 6 skills as the starter skill. **Max 4 active skills**, **max skill level 5**. **Max 4 passives**, **max passive level 5**. **3 cards** per level up (§5).
- An ultimate unlocks when **both** of its recipe skills reach level 5. It activates immediately, and its ingredient skills keep firing (§5).
- The run lasts **20 minutes**. The boss appears at minute 20, and killing it wins the run (§4, §7).
- Difficulty target: the boss is beatable with 1 ultimate and very hard without one (§10).
- Target: **60 FPS with ~400 enemies** plus projectiles (§7).
- Art comes only from claude-pxl. **If pxl cannot be used, stop and ask the owner** (§9).
- Keep the class as data. Don't hard-code "mage" in core logic (§12).
- Code identifiers are in English. Player-facing strings are in Indonesian.
- Temporary debug keys added before Task 15 carry a `// TEMP-DEBUG` comment, so Task 15 can find and remove them.

## Review Focus

1. **Tab hidden or window unfocused:** the game auto-pauses and resumes without time jumping, and no burst of simulated frames runs on return. Pinned in Task 1 (`stepClock` clamp test) plus a browser check.
2. **Several level-ups at once** (chest gives 1–3 levels, or one big gem crosses two thresholds): each level gets its own card screen in sequence, and none are lost. Pinned in Task 7 (`gainXp` multi-level test) and Task 8 (queue check).
3. **Fewer than 3 eligible cards, or everything maxed:** the card screen always shows 1–3 valid cards, falling back to a heal card, and never shows an empty or duplicate card. Pinned in Task 7.
4. **Ultimate unlock via any route** (card or chest), exactly once, the moment the second ingredient reaches level 5. Pinned in Task 7 (`newlyUnlocked` idempotence test).
5. **Huge crowds and mass deaths in one frame:** alive enemies are capped, particles and damage numbers are capped, and same-name SFX are throttled, so FPS holds. Pinned in Task 6 (spawner cap test), Task 9 (fx cap test) and Task 14 (throttle test).

---

## File map

```
index.html                     canvas + <script type=module src=src/main.js>
package.json                   {"type":"module", scripts: test, serve, art, release}
.gitignore                     .superpowers/  art/out/_preview/  dist/  .claude/skills/
.claude/launch.json            preview server config
art/palette.px.js              shared pal()/ramps(); include()d by every art file
art/{mage,enemies,fx,world,ui}.px.js   art sources, one sheet each
art/out/*.png|json             built sheets (committed)
src/main.js                    boot, scene machine, canvas scaling
src/debug.js                   debug keys (excluded from release)
src/engine/loop.js             stepClock + rAF loop
src/engine/input.js            keyboard/mouse state
src/engine/assets.js           parseSheet, loadSheets, animFrame, drawSprite
src/engine/font.js             bitmap text from the ui sheet
src/engine/audio.js            procedural SFX, mute
src/data/tuning.js             every number
src/data/classes.js            class definitions (skills, recipes, passives)
src/data/spawns.js             spawn schedule
src/logic/rng.js               seeded RNG
src/logic/grid.js              SpatialGrid
src/logic/combat.js            damage/status rules
src/logic/progression.js       XP, cards, recipes, passive mods
src/logic/spawner.js           spawn timing & positions
src/logic/records.js           localStorage records
src/game/world.js              map layout, terrain, ground pre-render
src/game/run.js                run state + update/draw orchestration
src/game/player.js             player movement/draw
src/game/enemies.js            enemy behaviours
src/game/pickups.js            gems, hearts, magnets, chests
src/game/projectiles.js        projectiles + area effects
src/game/fx.js                 particles, numbers, shake, hitstop, flashes
src/game/skills/index.js       SKILLS registry
src/game/skills/{fireball,meteor,iceShard,frostNova,chainLightning,arcaneOrb}.js
src/game/skills/ultimates.js   ULTS registry
src/ui/hud.js                  in-run HUD
src/ui/screens.js              menu, class select, starter pick, level up, pause, result, ult banner
test/*.test.js                 node:test suites
test/fixtures/sample-sheet.json  real pxl output copied in Task 2
scripts/release.sh             builds dist/survivors-hutan.zip
```

**Shared run object** (created in Task 5 and extended by later tasks; every task adds only the fields it names):

```js
run = {
  classDef, time /*s*/, rng, grid /*SpatialGrid*/, state /*'playing'|'levelup'|'won'|'lost'*/,
  player: { x, y, hp, maxHp, speed, iframesUntil, facing /*1|-1*/, moving },
  prog: { level, xp },            // Task 7
  build: { skills: {}, passives: {}, ults: [] },   // Task 7, e.g. skills: { fireball: 3 }
  pendingLevelUps: 0,             // Task 7
  skillState: {}, ultState: {},   // Task 10/11: per-skill timers
  enemies: [], projectiles: [], areas: [], pickups: [],
  fx,                             // Task 9
  kills: 0, bossDead: false,
}
```

---

### Task 1: Project skeleton, loop, input, scaling

**Files:**
- Create: `index.html`, `package.json`, `.gitignore`, `.claude/launch.json`, `src/main.js`, `src/engine/loop.js`, `src/engine/input.js`
- Test: `test/loop.test.js`

**Interfaces:**
- Produces: `stepClock(acc, frameDt, step = 1/60, maxFrame = 0.1) -> { steps, acc }`, `startLoop(update(dt), draw())`, `input.moveVector() -> {x, y}` (length ≤ 1), `input.pressed(code) -> boolean` (true once per key press, consumed on read), `input.mouse -> { x, y, clicked }` in internal 480×270 coordinates, `input.endFrame()`.

- [ ] **Step 1:** Run `git init`, then create `.gitignore` with the 4 entries from the file map. Create `package.json`:
  ```json
  {"name":"survivors-hutan","private":true,"type":"module",
   "scripts":{"test":"node --test","serve":"python3 -m http.server 8080",
     "art":"for f in art/[!p]*.px.js; do node .claude/skills/pxl-pixel-art/bin/pxl.js build \"$f\" || exit 1; done",
     "release":"bash scripts/release.sh"}}
  ```
  Create `.claude/launch.json` with one config: name `game`, runtimeExecutable `python3`, args `["-m","http.server","8080"]`, port 8080.
- [ ] **Step 2: Write the failing test** `test/loop.test.js`:
  ```js
  import { test } from 'node:test'; import assert from 'node:assert/strict';
  import { stepClock } from '../src/engine/loop.js';
  test('accumulates whole steps', () => {
    assert.deepEqual(stepClock(0, 1/30), { steps: 2, acc: 0 });
    const r = stepClock(0, 1/120); assert.equal(r.steps, 0); assert.ok(Math.abs(r.acc - 1/120) < 1e-9);
  });
  test('clamps long frames (tab return) to maxFrame', () => {
    assert.equal(stepClock(0, 5).steps, 6);   // 0.1s / (1/60) = 6
  });
  ```
- [ ] **Step 3:** Run `npm test`. Expected: FAIL (module not found).
- [ ] **Step 4:** Implement `src/engine/loop.js`. `startLoop` uses rAF, calls `update(1/60)` `steps` times, then calls `draw()`. It exposes `setPaused(bool)`; while paused, it only draws and resets the accumulator.
- [ ] **Step 5:** Run `npm test`. Expected: PASS.
- [ ] **Step 6:** Implement `input.js` (key state from `keydown`/`keyup` on `KeyW/A/S/D` and arrows, normalised diagonal; mouse mapped through the canvas scale). Implement `index.html`: one `<canvas width=480 height=270>`, black body, `image-rendering: pixelated`, no scrollbars. Implement `main.js`: resize handler that applies the scale rule from Global Constraints; a placeholder white 8×8 square moved by `moveVector() * 60 px/s`; `document.visibilitychange` and `window.blur` → `setPaused(true)`; focus or visible → resume on the next key press.
- [ ] **Step 7: Verify in the browser.** Run `preview_start game` and open `http://localhost:8080/`. The square moves with WASD and arrows at the same speed diagonally. Resize the window and check pixels stay crisp and the canvas stays centred. Switch tabs for 10 s, come back, and check the square did not jump. The console shows no errors.
- [ ] **Step 8: Commit.** `git add -A && git commit -m "feat: skeleton, fixed-step loop, input, scaling"` (the spec and plan docs are included).

---

### Task 2: pxl setup and style samples (**owner gate**)

**Files:**
- Create: `.claude/skills/pxl-pixel-art/` (clone), `art/palette.px.js`, `art/mage.px.js`, `art/enemies.px.js`, `art/fx.px.js`
- Create: `test/fixtures/sample-sheet.json` (copied from real output)

**Interfaces:**
- Produces: the pxl CLI at `node .claude/skills/pxl-pixel-art/bin/pxl.js`; `art/palette.px.js` (every art file starts with `include("palette.px.js")`); sheets `art/out/mage.json|png`, `art/out/enemies.json|png`, `art/out/fx.json|png`.
- Naming rule for every later art task: sprite and anim names are `<subject>_<action>`, for example `mage_walk`, `slime_walk`, `fireball_fly` or `fx_explosion`. A sheet named X contains `X`-related assets.

- [ ] **Step 1:** Run `git clone https://github.com/crsolver/claude-pxl.git .claude/skills/pxl-pixel-art`. Then run `node .claude/skills/pxl-pixel-art/bin/pxl.js build .claude/skills/pxl-pixel-art/examples/basics.px.js --out /tmp/pxltest`. Expected: PNGs are written. If clone or build fails, **stop and ask the owner** (§9).
- [ ] **Step 2:** Read the pxl `SKILL.md` and `reference.md` (animation, sheet, glow sections).
- [ ] **Step 3:** Write `art/palette.px.js`. Use one custom bright, cheerful palette of about 24–32 colours via `pal({...})` plus `ramps(...)`, matching mockup B ("Hutan Cerah": fresh greens, sky-blue water, warm wood, red/purple monsters, plus white/yellow/orange/cyan/violet for spells). Use mnemonic keys and an outline key `k`.
- [ ] **Step 4:** Draw the style samples:
  - `mage_idle` (2–4 frames) and `mage_walk` (4 frames) at about 16×16, outlined, facing right (the game flips for left).
  - `slime_walk` (3–4 frames, squash/stretch) at about 16×16.
  - `fireball_fly` (3 frames) at about 8×8 with `glow`, plus `fx_explosion` (5–6 frames) at about 24×24 with glow.
  - Add `sheet("mage", ["mage_*"])`, `sheet("enemies", ["slime*"])` and `sheet("fx", ["fireball*", "fx_*"])` at the bottom of each file.
- [ ] **Step 5:** Build each file with `node .claude/skills/pxl-pixel-art/bin/pxl.js build art/<f>.px.js`. Check `art/out/_preview/*.png` and `*.gif`. Iterate until the result honestly meets §9 "Standar nggak ampas": readable silhouette, outline, clear animation.
- [ ] **Step 6:** Copy `art/out/mage.json` to `test/fixtures/sample-sheet.json`.
- [ ] **Step 7: OWNER GATE.** Start `pxl serve` (or open the previews/GIFs) and show the owner the mage, the slime and the fireball/explosion. Ask: "Gaya ini udah oke buat semua aset lain?" Iterate on their feedback. **Do not start the art steps of Tasks 4, 6, 7, 8, 10, 11 and 12 until the owner approves.** Tasks 3, 5, 7 and 9 may proceed meanwhile.
- [ ] **Step 8: Commit.** `git add art test/fixtures && git commit -m "art: palette and approved style samples"`.

---

### Task 3: Asset loading and sprite drawing

**Files:**
- Create: `src/engine/assets.js`
- Modify: `src/main.js` (load sheets before start; draw `mage_idle`/`mage_walk` instead of the square)
- Test: `test/assets.test.js`

**Interfaces:**
- Consumes: the pxl sheet JSON format (TexturePacker hash; anims expanded to `name_0..n` with `duration` and `meta.frameTags`). Read the fixture before coding.
- Produces: `parseSheet(json) -> { frames: {[name]: {x,y,w,h}}, anims: {[name]: {frames: string[], durations: number[] /*ms*/, total: number}} }`; `animFrame(anim, tMs, loop = true) -> string`; `loadSheets(names: string[]) -> Promise<Assets>`, where `Assets.draw(ctx, name, x, y, { flip = false, t = 0, alpha = 1, flash = false })` draws a sprite or anim centred at x,y (`flash` draws it solid white, used for the hit flash); `Assets.has(name)`.

- [ ] **Step 1: Write the failing test** `test/assets.test.js`. It loads `test/fixtures/sample-sheet.json` and asserts:
  - `parseSheet(f).anims.mage_walk.frames.length === 4`
  - every frame name in every anim exists in `frames`
  - `total` equals the sum of `durations`
  - `animFrame({frames:['a','b'],durations:[100,100],total:200}, 150) === 'b'`
  - `animFrame(...same, 250) === 'a'` (loops)
  - `animFrame(...same, 250, false) === 'b'` (holds the last frame)
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `src/engine/assets.js`. Fetch JSON and PNG from `art/out/`. Build the white-flash version of each sheet once on an offscreen canvas (`globalCompositeOperation = 'source-atop'` fill white).
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5: Verify in the browser.** The mage idles when still, walks when moving, and flips when moving left. Pixels are crisp. No console errors.
- [ ] **Step 6: Commit.**

---

### Task 4: World map (Hutan Cerah)

**Files:**
- Create: `art/world.px.js` (tiles, decor, hut, bridge), `src/game/world.js`, `src/logic/rng.js`
- Modify: `src/main.js` (camera follows the player; draw the world)
- Test: `test/world.test.js`, `test/rng.test.js`

**Interfaces:**
- Produces:
  - `createRng(seed) -> { next() /*[0,1)*/, int(a,b) /*inclusive*/, pick(arr), range(a,b) }` (mulberry32).
  - In `world.js`:
    - constants `WORLD_W = 1920`, `WORLD_H = 1080`, `HUT = {x: 960, y: 540}`, `SPAWN = {x: 960, y: 572}`, `RIVER_W = 44`, `BRIDGE = {y0: 524, y1: 556}`
    - `riverX(y) -> number` (centre line = `1480 + 36*Math.sin(y/95)`)
    - `isWater(x,y)`, `onBridge(x,y)`, `terrainSpeed(x,y) -> 0.45 in water, 1 elsewhere`
    - `clampToWorld(p, margin = 8)`
    - `placeDecor(rng) -> [{kind, x, y}]`
    - `buildGround(assets, decor) -> HTMLCanvasElement` (1920×1080, pre-rendered once)
    - `drawWorldTop(ctx, assets, cam, t)` (animated bits: river shimmer, hut chimney smoke, swaying flowers)
    - `camera(player) -> {x, y, w: 480, h: 270}` (clamped to the world)

- [ ] **Step 1: Write the failing tests.**
  - `rng.test.js`: two RNGs with the same seed give equal 10-value sequences; `int(1,3)` stays in [1,3] over 1000 draws.
  - `world.test.js`:
    - `isWater(riverX(300), 300) === true`
    - `isWater(riverX(300) + 40, 300) === false`
    - `onBridge(riverX(540), 540) === true`
    - `terrainSpeed(riverX(540), 540) === 1` (bridge is not water-slow)
    - `terrainSpeed(riverX(300), 300) === 0.45`
    - `clampToWorld({x:-50,y:5000})` → `{x:8, y:1072}`
    - `placeDecor(createRng(1))`: no decor within 70 px of `HUT`, none in water, none on the path rectangle (hut → bridge, x 960..riverX(540), y 532..552), same output for the same seed, length ≥ 150
    - `camera({x:0,y:0})` → `{x:0,y:0,w:480,h:270}`
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `rng.js` and `world.js`. Trees are packed densely within 64 px of the world edges (the "hutan lebat" wall, visual only); the player is clamped by `clampToWorld`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Draw `art/world.px.js`. It needs:
  - 16×16 grass tiles (3–4 variants), flowers, path, river bank edges, an animated water strip
  - a bridge, at least 3 tree variants (about 24–32 px tall), bushes and rocks
  - the hut (about 48×40) with an animated chimney smoke anim
  - follow pxl "no filler noise" habits

  Build it and check the previews against mockup B.
- [ ] **Step 6:** Wire it in: the camera follows the player, the player is slowed in water, and trees are drawn with y-sorting relative to the player (behind if above, in front if below). The player starts at `SPAWN`.
- [ ] **Step 7: Verify in the browser.** Walk to all four edges, cross the river (slow) and the bridge (normal). It looks like mockup B. FPS is steady.
- [ ] **Step 8: Commit.**

---

### Task 5: Tuning data, class data, spatial grid, combat rules, run object

**Files:**
- Create: `src/data/tuning.js`, `src/data/classes.js`, `src/logic/grid.js`, `src/logic/combat.js`, `src/game/run.js`, `src/game/player.js`
- Modify: `src/main.js` (use `createRun`, `updateRun` and `drawRun` instead of the ad-hoc player)
- Test: `test/grid.test.js`, `test/combat.test.js`

**Interfaces:**
- Produces:
  - `TUNING` (default export object, values below).
  - `CLASSES = { mage: {...}, swordman: {id, name: 'Swordman', locked: true}, archer: {id, name: 'Archer', locked: true} }`, where mage = `{ id: 'mage', name: 'Mage', skills: ['fireball','meteor','iceShard','frostNova','chainLightning','arcaneOrb'], recipes: [{ult:'armageddon', a:'fireball', b:'meteor'}, {ult:'absoluteZero', a:'iceShard', b:'frostNova'}, {ult:'badaiPetir', a:'chainLightning', b:'arcaneOrb'}] }`.
  - `PASSIVES = ['vitality','swiftness','focus','magnet','wisdom','amplify']`.
  - `NAMES`: Indonesian display names and one-line descriptions for every skill, ult and passive, for example `fireball: {name:'Fireball', desc:'Bola api ke musuh terdekat, meledak saat kena.'}`, `armageddon: {name:'Armageddon', ...}`, `vitality: {name:'Vitalitas', desc:'+20 HP maks'}`.
  - `new SpatialGrid(cell = 32)` with `.clear()`, `.insert(e)` (reads `e.x`, `e.y`), and `.query(x, y, r, out = []) -> out` (candidates from overlapping cells; the caller checks the exact distance).
  - In `combat.js`:
    - `hitEnemy(e, dmg, now) -> {dealt, killed}`: `dealt = dmg * (now < e.vulnerableUntil ? TUNING.frozenVulnMult : 1)`, rounded; sets `e.flashUntil = now + 0.08`; `killed` when `e.hp <= 0` and the enemy was not already dead (`e.dead` is set once).
    - `hurtPlayer(p, dmg, now) -> boolean`: false while `now < p.iframesUntil`; otherwise it subtracts HP and sets `iframesUntil = now + TUNING.player.iframes`.
    - `speedFactor(e, now) -> 0 if frozen (now < e.frozenUntil), (1 - e.slowAmt) if now < e.slowUntil, else 1`.
    - `knockback(e, fromX, fromY, power)`.
  - `createRun(classId, starterSkillId, seed) -> run` (shared shape above); `updateRun(run, dt, input)`; `drawRun(ctx, run, assets)`.

**TUNING initial values** (§10: starting guesses, tuned in Task 17):

```
player: { hp: 100, speed: 60, iframes: 0.5, magnet: 24, pickup: 8 }
frozenVulnMult: 2
xp: { base: 5, step1: 10, step2: 13, step3: 16 }          // see Task 7
enemyHpGrowthPerMin: 0.08, maxEnemies: 400
enemies (hp, speed px/s, dmg, xp, size px):
  slime 6,30,5,1,12 | bat 4,70,4,1,10 | slimeRed 18,38,8,2,12 | goblin 20,45,8,2,14
  wolf 25,85,10,3,16 | orc 80,28,15,5,18 | witch 30,35,8,4,14 (keepDist 110, shotEvery 3s, shotSpeed 60, shotDmg 10)
  kingSlime 600,25,20,40,32 (splits into 8 slime on death)
  orcChief 1200,35,25,60,32 (charge: windup 0.8s, speed 180, every 5s)
  treant 8000,15,30,0,64 (roots: warn 1.0s, r 20, dmg 20, every 3s; summons 6 goblin every 12s)
skills (lv1 → lv5):
  fireball      dmg 10,+4/lv  cd 1.2  speed 160  boomR 12→20  count 1,1,2,2,3
  meteor        dmg 30,+10/lv cd 4.0→3.0  r 28→44  count 1,1,2,2,3  warn 0.8s  burn 1.5→3s @6dps
  iceShard      dmg 8,+3/lv   cd 1.0  pierce 1→5  shards 1,2,2,3,3 (fan 15°)  slow 30→50% for 1.5s  speed 180
  frostNova     dmg 6,+2/lv   cd 4.0,-0.3/lv  r 36,+6/lv  freeze 1.0,+0.2/lv
  chainLightning dmg 12,+4/lv cd 1.5  jumps 2→6  strikes 1,1,2,2,3  jumpRange 60
  arcaneOrb     dmg 6,+2/lv   orbs 2→6  orbitR 28,+3/lv  rotSpeed 3.0,+0.4/lv rad/s  perEnemyHitCd 0.5
ults:
  armageddon   cd 25  dur 4  rate 6 meteors/s at random on-screen points  dmg 60  r 36
  absoluteZero cd 30  freeze 3s every on-screen enemy  vulnerable ×2 during freeze  hitDmg 20
  badaiPetir   cd 25  dur 6  rate 5 strikes/s within 140px of player  dmg 40  orbs +50% dmg during
passives (per level): vitality +20 maxHp | swiftness +8% speed | focus -6% cooldown
  | magnet +25% radius | wisdom +10% xp | amplify +8% area
healCard: 30
drops: heartChance 0.01 (heals 25) | magnetChance 0.003
  | gem tiers: xp 1 → 'gem_blue', 2–4 → 'gem_green', ≥5 → 'gem_red'
fx: shakeMeteor [2px,0.15s] | shakeUlt [4px,0.4s] | hitstopBig 0.05s | maxParticles 600 | maxNumbers 150
```

- [ ] **Step 1: Write the failing tests.**
  - `grid.test.js`: insert 3 entities at (10,10), (40,10) and (300,300); `query(12,12,40)` includes the first two and not the third. After `clear()`, the query returns `[]`.
  - `combat.test.js`:
    - `hitEnemy({hp:10}, 4, 0)` → `{dealt:4, killed:false}`, hp 6
    - with `vulnerableUntil: 5` at now 1, dmg 4 → `dealt 8`
    - killing twice → second `killed === false`
    - `hurtPlayer` twice within 0.5 s → second returns false and hp only drops once
    - `speedFactor({frozenUntil:2}, 1) === 0`
    - `speedFactor({slowUntil:2, slowAmt:0.3}, 1) === 0.7`
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement the five modules. `run.js` rebuilds `run.grid` from enemies once per update. `player.js` covers movement using `terrainSpeed` and `clampToWorld`, plus facing.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5: Verify in the browser:** the game still works as in Task 4.
- [ ] **Step 6: Commit.**

---

### Task 6: Enemies and spawner

**Files:**
- Create: `src/data/spawns.js`, `src/logic/spawner.js`, `src/game/enemies.js`
- Modify: `art/enemies.px.js` (all regular enemies), `src/game/run.js`
- Test: `test/spawner.test.js`

**Interfaces:**
- Consumes: `TUNING.enemies`, `SpatialGrid`, `combat.*`, `createRng`, `world.*`.
- Produces:
  - `SCHEDULE` data in `spawns.js`. It holds:
    - `waves`: `[{from: minute, to: minute, rate: perSec, mix: {type: weight}}]`, following §7. Rate ramps from 1.0/s at minute 0 to about 12/s at minute 19. The mix gives older types a smaller share over time.
    - `events`: `[{at: seconds, kind: 'batRing'|'wolfPack', count}]`, at minutes 3, 6, 8, 11, 13, 16 and 18.
    - `bosses`: `[{at: 600, type: 'kingSlime'}, {at: 900, type: 'orcChief'}, {at: 1200, type: 'treant'}]`.
  - `offscreenPoint(view, bounds, rng, margin = 16) -> {x, y}`: outside `view` by at least `margin`, inside `bounds`.
  - `createSpawner()` and `spawnerUpdate(sp, t, dt, view, bounds, rng, aliveCount) -> [{type, x, y}]`. When `aliveCount >= TUNING.maxEnemies`, it returns no regular spawns. Events and bosses are never skipped: they fire once when `t` crosses `at`. A batRing returns `count` bats on a circle of radius 200 around the view centre, clamped to bounds.
  - `spawnEnemy(run, type, x, y)`: hp is scaled by `1 + enemyHpGrowthPerMin * minute` for non-bosses.
  - `updateEnemies(run, dt)` and `drawEnemies(ctx, run, assets)`.
  - Behaviours:
    - chase: slime, slimeRed, goblin, orc
    - bat: chase plus a sine wobble perpendicular to its heading
    - wolf: a straight line toward the player's position at spawn time, re-aiming every 2 s
    - witch: keeps a distance of 110 and fires a projectile into `run.projectiles` with `hostile: true`
  - Separation: a cheap push-apart between neighbouring enemies via the grid, so crowds don't collapse into one pixel.
  - Contact damage uses `hurtPlayer`. Death pushes a gem via `dropGem(run, x, y, xp)` (stubbed here, implemented in Task 7) and increments `run.kills`.
  - Off-screen culling: enemies more than 700 px from the player are relocated with `offscreenPoint`, which keeps the pressure on.
  - Water slows enemies via `terrainSpeed`.

- [ ] **Step 1: Write the failing tests** (`spawner.test.js`):
  - `offscreenPoint`, 2000 draws, view `{x:0,y:0,w:480,h:270}` (corner), bounds `{w:1920,h:1080}`: every point is inside the bounds and outside the view expanded by the margin.
  - The same with the view in the centre.
  - Over 60 simulated seconds at dt 1/60 starting at t=0, aliveCount 0: the regular spawn count is within 40–80 (rate ≈1/s).
  - aliveCount 400 → no regular spawns over 10 s.
  - Crossing t=600 yields exactly one `kingSlime` across the step, and stepping past it again yields none.
  - Crossing an event time yields `count` entities of the right type.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `spawns.js` and `spawner.js`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Draw the remaining enemies in `art/enemies.px.js`: `bat_fly`, `slimeRed_walk` (a `base`+`swap` of slime), `goblin_walk`, `wolf_run`, `orc_walk`, `witch_walk`, `witch_cast` and `witchShot_fly` (glow), 3–4 frames each, plus a shared `fx_poof` death anim in `fx.px.js`. Rebuild and check the previews.
- [ ] **Step 6:** Implement `enemies.js` and wire it into `run.js`.
- [ ] **Step 7: Verify in the browser.** Enemies arrive from all sides. A temporary debug keypress jumps the time so you can see each type behave (Task 16 replaces this). Crowds spread out instead of stacking. Touching enemies drops HP. FPS is steady with about 300 enemies.
- [ ] **Step 8: Commit.**

---

### Task 7: XP, progression, cards, recipes, passives

**Files:**
- Create: `src/logic/progression.js`, `src/game/pickups.js`
- Modify: `src/game/run.js`, `src/game/enemies.js` (real `dropGem`)
- Test: `test/progression.test.js`

**Interfaces:**
- Consumes: `CLASSES`, `PASSIVES`, `TUNING`.
- Produces:
  - `xpToNext(level)`:
    - level < 20: `5 + 10*(level-1)`
    - level < 40: `185 + 13*(level-19)`
    - else: `445 + 16*(level-39)`
  - `gainXp(prog, amount) -> levelsGained`: mutates `{level, xp}` and carries the remainder over.
  - `rollCards(build, classDef, rng, n = 3) -> Card[]`, with `Card = {kind: 'skill'|'passive'|'heal', id?, nextLevel?}`.
    - Eligible: owned skills < 5, unowned class skills if owned skill count < 4, owned passives < 5, unowned passives if owned passive count < 4.
    - Pick up to n distinct eligible cards at random.
    - If fewer than n are eligible, return what exists, and if none, `[{kind:'heal'}]` (heals `TUNING.healCard` = 30 HP).
  - `applyCard(build, card)`.
  - `newlyUnlocked(build, classDef) -> ultIds[]`: recipes with both ingredients at 5 and `ult` not already in `build.ults`. The caller pushes them into `build.ults`.
  - `recipeTags(classDef, skillId) -> ultIds[]`.
  - `passiveMods(build) -> {maxHp: +flat, speed: ×, cooldown: ×, magnet: ×, xp: ×, area: ×}`, from the per-level values in `TUNING`.
  - In `pickups.js`:
    - `dropGem(run, x, y, xp)`, `dropHeart`, `dropMagnet`, `dropChest(run, x, y, levels)`
    - `updatePickups(run, dt)`: the magnet radius pulls pickups, picking one up applies it, and gems call `gainXp(run.prog, xp * mods.xp)`, adding the result to `run.pendingLevelUps`
    - `drawPickups`
  - When `run.pendingLevelUps > 0`, `updateRun` sets `run.state = 'levelup'` and returns early.
  - `run.cards` holds the current roll.
  - `chooseCard(run, card)` in `src/game/run.js` applies the card (a heal card heals the player). If it's a skill, it then runs `newlyUnlocked`, pushes the results into `run.build.ults` and `run.newUlts` (for the banner), decrements `pendingLevelUps`, and either rolls again or returns to `'playing'`.
  - Merging gems: if more than 300 gems exist, the farthest ones merge into the nearest one (sum of xp), so gem count stays bounded.

- [ ] **Step 1: Write the failing tests** (`progression.test.js`):
  - XP curve: `xpToNext(1)===5`, `(2)===15`, `(19)===185`, `(20)===198`, `(40)===461`.
  - `gainXp({level:1,xp:0}, 21)` → returns 2, prog `{level:3, xp:1}` (multi-level).
  - With 4 owned skills, `rollCards` never offers an unowned skill (500 seeds).
  - With all 4 owned skills at 5, and 4 passives owned at 5: returns exactly `[{kind:'heal'}]`.
  - When exactly 1 card is eligible: returns 1 card.
  - The cards in one roll never repeat an id (500 seeds).
  - Recipes: build `{skills:{fireball:5, meteor:4}}` → `newlyUnlocked` = `[]`. After `applyCard` meteor → `['armageddon']`. After pushing it into `ults`, calling it again → `[]`.
  - `recipeTags(mage,'fireball')` → `['armageddon']`.
  - `passiveMods({passives:{focus:2}}).cooldown` ≈ 0.88.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `progression.js`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Implement `pickups.js` and draw `gem_blue/green/red` (2-frame sparkle), `heart`, `magnet` and `chest` (plus a `chest_open` anim) in `art/world.px.js`. Wire the pickups into the run. While no UI exists, auto-pick the first card (temporary until Task 8).
- [ ] **Step 6: Verify in the browser.** Gems drop, get magnetised and picked up, and the level rises.
- [ ] **Step 7: Commit.**

---

### Task 8: Level-up screen, starter pick, HUD, font

**Files:**
- Create: `art/ui.px.js`, `src/engine/font.js`, `src/ui/hud.js`, `src/ui/screens.js` (level-up and starter-pick parts only)
- Modify: `src/main.js`, `src/game/run.js` (remove the auto-pick)

**Interfaces:**
- Consumes: `rollCards`, `chooseCard`, `recipeTags`, `NAMES`, `input.pressed`, `input.mouse`.
- Produces:
  - `drawText(ctx, assets, str, x, y, {color = 'w', align = 'left'|'center'|'right', scale = 1})` and `textWidth(str)`.
    - The glyphs come from the `ui` sheet: `glyph_<charCode>` sprites drawn with pxl `text()`.
    - Cover ASCII 32–126. Colour variants are built by `swap` (at least white, yellow and red).
    - If pxl's built-in font lacks glyphs, draw the missing ones in the same file.
  - `drawHud(ctx, run, assets)`:
    - XP bar across the top, with `Lv N`
    - timer `mm:ss` top centre
    - kill count top right
    - HP bar under the player
    - bottom left: skill icons, each with level pips (5 dots), then passive icons
    - bottom right: recipe panel, one row per recipe (`icon_a + icon_b → ult icon`), with each ingredient's pips, and the ult icon greyed until unlocked
  - `levelUpScreen` and `starterPickScreen`. Both are objects with `update(input) -> chosen|null` and `draw(ctx)`.
    - Cards are laid out horizontally. Each card shows its icon, name, `Baru!` or `Lv N→N+1`, the description, and recipe tags rendered as `★ <ult name>`.
    - Keys `1`/`2`/`3`, arrows plus Enter, or a mouse click choose a card.
    - The starter pick shows all 6 mage skills (2 rows of 3) titled `Pilih skill awal`.
  - Ultimate banner: when `run.newUlts` is non-empty, show the big banner `ULTIMATE TERBUKA: <name>!` for 2.5 s, with the fx from Task 9 once it exists.

- [ ] **Step 1:** Draw `art/ui.px.js`:
  - glyph sheet
  - 16×16 icons: `icon_<skillId>` ×6, `icon_<ultId>` ×3, `icon_<passiveId>` ×6
  - card frame (9-slice or fixed 120×150), bar frames, pips, panel background

  Build it and check the previews. Every icon must be distinct and readable at 1×.
- [ ] **Step 2:** Implement `font.js`, `hud.js` and the two screens. Wire the flow `starterPick → playing ↔ levelup` in `main.js`. While the level-up screen is open the simulation is frozen, but the level-up screen itself animates.
- [ ] **Step 3: Verify in the browser.**
  - The starter pick appears with 6 cards, and choosing one gives that skill at Lv1. The skill itself doesn't fire yet; that comes in Task 10.
  - Level up shows 3 cards with correct recipe tags. Keyboard and mouse both work.
  - Gaining 2+ levels at once (a temporary 50-xp gem) shows consecutive screens.
  - The HUD is readable over the busy forest.
  - All text is in Indonesian.
- [ ] **Step 4: Commit.**

---

### Task 9: FX system (game feel)

**Files:**
- Create: `src/game/fx.js`
- Modify: `src/game/run.js`, `src/game/enemies.js` (hit flash via `flash`, knockback, death poof, damage numbers), `src/main.js` (apply the shake offset and hitstop)
- Test: `test/fx.test.js`

**Interfaces:**
- Produces: `createFx()` returning:
  - `shake(px, dur)`: the strongest active shake wins
  - `hitstop(sec)`: pauses the simulation while drawing continues
  - `number(x, y, value, color)`: rises 12 px and fades over 0.6 s; at most 150, dropping the oldest
  - `burst(x, y, color, count, speed)`: at most 600 particles, dropping the oldest
  - `flashScreen(color, dur)`
  - `anim(x, y, animName, {scale})`: a one-shot anim such as an explosion
  - `update(dt)`, `draw(ctx, cam, assets)`, `offset() -> {x, y}`, `frozen() -> boolean` (hitstop active)

- [ ] **Step 1: Write the failing tests:**
  - After 1000 `burst` calls of 10 particles each, the particle count is ≤ 600.
  - After 400 `number` calls, the number count is ≤ 150.
  - `shake(2, 0.1)` then `shake(4, 0.4)` leaves the stronger shake in effect, and after `update(0.5)`, `offset()` returns `{x:0, y:0}`.
  - `hitstop(0.05)`: `frozen()` is true, then false after `update(0.06)`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `fx.js` (pooled arrays, no per-frame allocation in hot paths).
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Wire the fx in:
  - enemy hit: white flash 0.08 s, knockback, damage number
  - enemy death: `fx_poof` plus a small coloured burst
  - player hurt: red screen flash and the player blinking during iframes
- [ ] **Step 6: Verify in the browser:** hitting and killing enemies feels punchy (use a temporary damage aura if no skill exists yet, then remove it).
- [ ] **Step 7: Commit.**

---

### Task 10: Mage skills

**Files:**
- Create: `src/game/projectiles.js`, `src/game/skills/index.js`, and the six `src/game/skills/<id>.js` files
- Modify: `art/fx.px.js`, `src/game/run.js`
- Test: `test/skills.test.js`

**Interfaces:**
- Consumes: `run`, `run.grid`, `hitEnemy`, `speedFactor`, `passiveMods`, `fx`, `TUNING.skills`.
- Produces:
  - `spawnProjectile(run, {x, y, vx, vy, dmg, radius, pierce = 1, life, sprite, hostile = false, onHit?(run, p, e), onEnd?(run, p)})`.
  - `spawnArea(run, {x, y, r, dmg, delay = 0, dur = 0, tickEvery = 0.5, freeze = 0, slow = 0, sprite?, warnSprite?, onTrigger?})`. After `delay` it applies `dmg` to every enemy within `r`, then optionally ticks for `dur`.
  - `updateProjectiles(run, dt)`: hostile projectiles hit the player via `hurtPlayer`. `drawProjectiles` draws them.
  - `stat(skillId, key, level)` in `skills/index.js`: reads `TUNING.skills[id][key]`, which is either an array of 5 values or `{base, perLv}`.
  - Each skill module: `export default { id, update(run, st, level, mods, dt), draw?(ctx, run, st, level, assets, cam) }`, where `st` is `run.skillState[id]` (created as `{}`). The cooldown is multiplied by `mods.cooldown` and every radius by `mods.area`.
  - `SKILLS = {fireball, meteor, iceShard, frostNova, chainLightning, arcaneOrb}`.
  - Helpers in `skills/index.js`:
    - `nearestEnemy(run, x, y, maxR)`
    - `densestPoint(run, view) -> {x, y}`: the 32 px grid cell with the most enemies inside the camera view, with ties broken by distance to the player; returns the player position if the view is empty
    - `randomOnScreenEnemy(run, rng)`
  - Behaviours follow the §5 table and the `TUNING` numbers:
    - Fireball explodes on hit (`spawnArea` r=boomR plus `fx_explosion`).
    - Meteor shows `meteor_warn` at `densestPoint` for 0.8 s, then falls, deals damage and spawns burning ground; it shakes `shakeMeteor`.
    - Ice Shard pierces, fans and applies the slow.
    - Frost Nova is a ring anim plus a freeze.
    - Chain Lightning hits an on-screen enemy and jumps to the nearest enemy not yet hit within jumpRange; the bolt is drawn as a jagged line for 0.12 s.
    - Arcane Orb keeps per-enemy hit cooldowns stored in a `WeakMap` on `st`.

- [ ] **Step 1: Write the failing tests** (pure helpers only, with run stubs of plain objects):
  - `stat('fireball','count',3) === 2`
  - `stat('frostNova','cd',5)` ≈ 2.8
  - `stat('arcaneOrb','orbs',5) === 6`
  - `densestPoint`: a stub with 5 enemies clustered at (300,300) and 1 at (100,100), view covering both → a point within 32 px of (300,300)
  - `densestPoint`: an empty view → the player position
  - Chain lightning target selection, `chainTargets(run, first, jumps, range)` exported from `chainLightning.js`: never repeats an enemy, stops when none is within range, and returns at most `jumps+1` targets
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `stat`, `densestPoint`, `nearestEnemy` and `chainTargets`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Draw the skill art in `art/fx.px.js`. Every item glows with its own colour family (fire orange/yellow, ice cyan/white, lightning yellow-white/violet, arcane magenta):
  - `meteor_fall`, `meteor_warn` (pulsing shadow ring), `fx_burn` (ground fire loop)
  - `iceShard_fly`, `fx_iceHit`, `fx_frostNova` (expanding ring, about 64–120 px, drawn scaled to r), `fx_frozen` (ice overlay for frozen enemies)
  - `fx_lightningHit` (bolt segment sprite optional; a line with glow is acceptable)
  - `arcaneOrb` loop
- [ ] **Step 6:** Implement the six skills and wire them in: `run.js` calls each owned skill's `update` and `draw`.
- [ ] **Step 7: Verify in the browser:** use the temporary key to grant a skill, or use the starter pick.
  - Each skill behaves per §5 at Lv1 and Lv5.
  - Frozen enemies stop and show ice, and slowed enemies move slower.
  - Area skills scale with the Amplify passive.
  - FPS holds with all 4 skills at Lv5 and about 400 enemies.
- [ ] **Step 8: Commit.**

---

### Task 11: Ultimates

**Files:**
- Create: `src/game/skills/ultimates.js`
- Modify: `art/fx.px.js`, `src/game/run.js`, `src/ui/screens.js` (the banner uses fx)

**Interfaces:**
- Consumes: Task 10 helpers, `fx`, `TUNING.ults`, `run.build.ults`.
- Produces: `ULTS = {armageddon, absoluteZero, badaiPetir}`, with the same module shape as the skills (`level` is unused). An ult fires immediately when it's unlocked, then repeats on its cooldown multiplied by `mods.cooldown`.
  - **Armageddon:** for `dur`, spawns `rate` meteors per second at random on-screen points (each a `spawnArea` with a short 0.3 s warning). The screen tints red (`flashScreen` held at low alpha) and shakes with `shakeUlt`.
  - **Absolute Zero:** every enemy within the camera view gets `frozenUntil = vulnerableUntil = now + 3` and takes `hitDmg`. The screen flashes cyan. Enemies that die while vulnerable shatter (`fx_shatter` plus an ice burst).
  - **Badai Petir:** a storm cloud sprite follows the player for `dur`, with `rate` strikes per second on random enemies within 140 px (chain fx). While it's active, orb damage is ×1.5 via `run.ultState.badaiPetir.active`.
  - Banner: when an ult unlocks, `ULTIMATE TERBUKA: <name>!` appears with `fx.shake` and `hitstop 0.1`.

- [ ] **Step 1:** Draw `fx_shatter`, `stormCloud` (an anim loop about 48 px wide, dark with flickering glow), `ult_banner` frame, and `fx_ultFlash` in `art/fx.px.js`. Build it and check the previews.
- [ ] **Step 2:** Implement `ultimates.js` and wire it into `run.js`, which updates every ult in `run.build.ults`.
- [ ] **Step 3: Verify in the browser.** Grant both ingredients at Lv5 (temporary key):
  - The banner shows once and the ult fires immediately and then on its cooldown.
  - The ingredient skills keep firing.
  - The recipe panel lights up.
  - All three ults look spectacular and distinct.
  - FPS holds during Armageddon with about 400 enemies.
- [ ] **Step 4: Commit.**

---

### Task 12: Mini-bosses, boss, chests, win/lose

**Files:**
- Modify: `src/game/enemies.js`, `art/enemies.px.js`, `src/game/pickups.js`, `src/game/run.js`

**Interfaces:**
- Consumes: `SCHEDULE.bosses`, `TUNING.enemies.{kingSlime, orcChief, treant}`, `dropChest`.
- Produces:
  - `kingSlime`: chases; on death it spawns 8 `slime` around itself and drops a chest worth 1 level.
  - `orcChief`: every 5 s it winds up for 0.8 s (shaking, flashing red, with a telegraph line on the ground), then charges in a straight line at 180 px/s for 1.2 s. It drops a chest worth 2 levels.
  - `treant`: walks slowly. Every 3 s it shows a warning circle (`roots_warn`) under the player's current position, and 1.0 s later `roots_hit` deals damage. Every 12 s it summons 6 goblins. It has a boss HP bar at the top of the screen with the name `Pohon Tua`.
    - On death: a big fx sequence, then `run.bossDead = true`, and 2 s later `run.state = 'won'`.
    - When the treant spawns, regular waves continue at the minute-19 mix, at half rate.
  - Chests: picking one up plays `chest_open` and adds `levels` to `pendingLevelUps` (1–3).
  - `run.state = 'lost'` when `player.hp <= 0`, after a 1.5 s `mage_death` anim.
  - The run timer keeps counting past 20:00 until the treant dies.

- [ ] **Step 1:** Draw `kingSlime_walk` (32 px, crown), `orcChief_walk` and `orcChief_charge` (32 px), `treant_walk` and `treant_attack` (64 px), `roots_warn` and `roots_hit`, and `mage_hurt` and `mage_death` (if not already drawn). Build and check the previews.
- [ ] **Step 2:** Implement the behaviours, chests, and the win/lose transitions.
- [ ] **Step 3: Verify in the browser** (with time skips via the temporary key):
  - King Slime at 10:00 splits and drops a chest.
  - The Orc Chief's telegraph is readable and the charge can be dodged.
  - The treant's roots can be dodged, it summons goblins, its HP bar shows, and killing it leads to the `won` state.
  - Dying leads to the `lost` state.
- [ ] **Step 4: Commit.**

---

### Task 13: Menus, class select, pause, results, records

**Files:**
- Create: `src/logic/records.js`
- Modify: `src/ui/screens.js`, `src/main.js`
- Test: `test/records.test.js`

**Interfaces:**
- Produces:
  - `loadRecords(storage) -> Records`, `saveRecords(storage, rec)`. Both catch any exception and treat a null storage as unavailable; load then returns the empty records.
  - `Records = { [classId]: { bestTime: 0, bestKills: 0, bestLevel: 0, wins: 0 } }`.
  - `mergeResult(rec, classId, {time, kills, level, won}) -> {records, newBest: ('time'|'kills'|'level')[]}` (pure; does not mutate the input).
  - Storage key: `'survivorsHutan.records.v1'`.
  - Screens, all keyboard- and mouse-operable, all text in Indonesian:
    - `menu`: title, `Main`, `Rekor`, `Suara: Nyala/Mati`. The background is the forest ground with a few wandering slimes.
    - `classSelect`: 3 cards. Mage is selectable. Swordman and Archer are greyed out with a lock and the label `Segera`.
    - `records`: per class.
    - `pause`: opened with Esc or auto-opened on blur; offers `Lanjut` and `Menyerah` (forfeit → lost).
    - `result`: `MENANG!` or `KALAH`, time, kills, level, unlocked ults (icons), `Rekor baru!` beside the improved stats, and `Main lagi` / `Menu`.
  - Scene flow in `main.js`: `menu → classSelect → starterPick → playing ↔ (levelup | paused) → result → menu|starterPick`.

- [ ] **Step 1: Write the failing tests** (`records.test.js`):
  - `loadRecords(null)` returns the empty records.
  - A storage stub whose `getItem` throws → empty records, and no throw.
  - `saveRecords(throwingStub, rec)` doesn't throw.
  - Corrupt JSON in storage → empty records.
  - `mergeResult(empty,'mage',{time:300,kills:50,level:10,won:false})` → bestTime 300, `newBest` includes all three, wins 0.
  - Merging a worse result → `newBest` = `[]`, and the original object is unchanged.
  - A won result → wins + 1.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `records.js`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Implement the screens and the scene flow. The `Rekor baru!` marker comes from `newBest`.
- [ ] **Step 6: Verify in the browser.**
  - The full loop works: menu → … → result → `Main lagi` gives a fresh run with no leftover state.
  - Esc pauses, and blur auto-pauses.
  - Records persist across a reload.
  - In a private window with storage blocked, the game still plays.
- [ ] **Step 7: Commit.**

---

### Task 14: Sound

**Files:**
- Create: `src/engine/audio.js`
- Modify: the call sites (skills, ults, hits, deaths, pickups, level up, boss, UI clicks), and `screens.js` (wire the mute toggle)
- Test: `test/audio.test.js`

**Interfaces:**
- Produces:
  - `sfx(name)`: procedural sounds with WebAudio (oscillators, a noise buffer and envelopes), no files.
  - Names: `fireball, meteor, ice, nova, zap, orb, hit, die, pickup, levelup, ult, hurt, bossRoar, chest, click`.
  - The AudioContext is created on the first user gesture.
  - `shouldPlay(name, now) -> boolean` (pure, exported): throttles each name to at most one play per 40 ms, and keeps at most 12 concurrent voices.
  - `setMuted(bool)` and `isMuted()`, persisted under `'survivorsHutan.muted'` with the same try/catch rules as records.

- [ ] **Step 1: Write the failing test:** `shouldPlay('hit', 0)` is true, `shouldPlay('hit', 0.02)` is false, `shouldPlay('hit', 0.05)` is true, and `shouldPlay('die', 0.02)` is true (per-name throttling).
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `audio.js`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Wire in all the call sites.
- [ ] **Step 6: Verify in the browser.**
  - Each sound is distinct and not harsh.
  - A crowd dying under Armageddon doesn't clip into noise.
  - Mute works and persists.
  - Audio is silent until the first click or key press, with no console autoplay errors.
- [ ] **Step 7: Commit.**

---

### Task 15: Debug mode

**Files:**
- Create: `src/debug.js`
- Modify: `src/main.js`, and remove every temporary debug key added in Tasks 6–12

**Interfaces:**
- Produces: `install(game)`, loaded only via `if (new URLSearchParams(location.search).has('debug')) import('./debug.js').then(m => m.install(game)).catch(() => {})`.
- Keys:
  - `F1` +60 s game time
  - `F2` +1 pending level
  - `F3` raise every owned skill to Lv5
  - `F4` toggle the FPS / enemy count / particle count overlay
  - `F6` spawn 400 slimes
  - `F7` toggle invincibility
  - `F8` jump to 19:50

- [ ] **Step 1:** Implement `debug.js` and remove the temporary keys from earlier tasks (`grep -rn "TEMP-DEBUG" src` returns nothing; earlier tasks must tag their temporary keys with that comment).
- [ ] **Step 2: Verify in the browser:** with `?debug`, every key works. Without it, F1–F8 do nothing and `debug.js` is not even requested (check the network panel).
- [ ] **Step 3: Commit.**

---

### Task 16: Performance pass

**Files:**
- Modify: whatever the profiler points at (likely `enemies.js`, `projectiles.js`, `fx.js` or `run.js`)

- [ ] **Step 1:** Open `?debug`, press `F8`, give every recipe skill Lv5 with F3 after choosing all 4 skills of two recipes, spawn more with `F6`, and watch the F4 overlay. Target: ≥ 58 FPS average with 400 enemies, 2 ults active and all fx, on the owner's machine.
- [ ] **Step 2:** If it's below the target, profile with the browser performance tab and fix the top hotspot only. Likely fixes, in order:
  - avoid per-frame allocations (pools)
  - cull draws outside the camera
  - reuse grid query arrays
  - pre-render the flash sheets once

  Repeat until the target is met.
- [ ] **Step 3:** Run `npm test`. Expected: all PASS.
- [ ] **Step 4: Commit.**

---

### Task 17: Balance pass with the owner

**Files:**
- Modify: `src/data/tuning.js` and `src/data/spawns.js` only

- [ ] **Step 1:** Play 3 full runs yourself with `?debug`, using F7 only to observe the late game. Adjust toward these targets:
  - the first ult around minute 10–14, the second before the boss (§5)
  - beatable with 1 ult, very hard without (§10)
  - minutes 0–2 should never kill an idle-but-moving player
- [ ] **Step 2:** Ask the owner to play at least 2 full runs without debug and collect their feedback ("terlalu gampang/susah/lemah"). Adjust only the numbers.
- [ ] **Step 3:** Run `npm test`. Expected: all PASS (the tests assert structure, not tuned values, except the XP curve; update that test if the curve itself changes).
- [ ] **Step 4: Commit.**

---

### Task 18: Release build

**Files:**
- Create: `scripts/release.sh`

**Interfaces:**
- Produces: `npm run release` creates `dist/survivors-hutan.zip`, which contains:
  - `index.html`
  - `src/**` except `src/debug.js`
  - `art/out/*.png` and `art/out/*.json` (no `_preview`, `sprites/`, `anims/` or `.gif`)

  The script stages the files into `dist/stage/` with `cp`, then runs `(cd dist/stage && python3 -m zipfile -c ../survivors-hutan.zip index.html src art)`.

- [ ] **Step 1:** Write `scripts/release.sh` (with `set -e`, a clean `dist/` first, and `index.html` at the zip root, which itch requires).
- [ ] **Step 2:** Run `npm run release`, then `python3 -m zipfile -l dist/survivors-hutan.zip`. Expected: `index.html` at the root, no `debug.js`, no `_preview`.
- [ ] **Step 3:** Unzip into `/tmp/sh-check`, serve it with `python3 -m http.server 8090 -d /tmp/sh-check`, and play one run to the first level up. Expected: it works, and `?debug` does nothing.
- [ ] **Step 4: Commit.**
- [ ] **Step 5:** Tell the owner the zip is ready for itch.io (upload as an HTML5 game with "This file will be played in the browser", viewport 960×540). Uploading is the owner's action.
