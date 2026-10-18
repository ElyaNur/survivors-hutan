# Fusion + Buku Resep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 3 fixed Mage ultimates with 15 pair fusions (two level-5 skills merge into one new skill), hide undiscovered fusions as "???" until first picked, record discoveries permanently, and add a Buku Resep page.

**Architecture:** Fusions are class data (`classDef.fusions`, 15 `{id, a, b}`). Pure rules (eligibility, guaranteed fusion card, applying a fusion) live in `src/logic/progression.js`, and discovery bookkeeping lives in `src/logic/records.js`; both are unit-tested. Each fusion is a module in `src/game/skills/fusions/` with the same shape as today's ultimates, registered in `FUSIONS`. The run tracks `build.fusions`, and `run.discovered` is seeded from records by `main.js`, which persists each discovery the moment a card is picked.

**Tech Stack:** Unchanged: plain ES modules, Canvas 2D, `node --test`, claude-pxl for art, python3 http.server for dev.

**Spec:** `docs/superpowers/specs/2026-10-18-fusion-buku-resep-design.md` (§N below). It amends `docs/superpowers/specs/2026-10-17-survivors-hutan-design.md` (v1 §N written as "v1 §N"). Read both.

## Global Constraints

- No framework, bundler or runtime dependency. Canvas is 480×270. Code identifiers are in English, **player-facing text in Bahasa Indonesia**.
- All gameplay numbers go in `src/data/tuning.js` (the `ults` block becomes `fusions`). Logic never hard-codes stats.
- A fusion needs **two held, unfused skills at level 5**. Ingredient order does not matter. **Max 2 skills per fusion**; a fusion skill cannot fuse again (§3).
- Picking a fusion removes both ingredients and adds the fusion in one slot. **Max 4 skill slots**, counting fusions. Consumed skills are never offered again that run (§3).
- **At least one of the 3 level-up cards is a fusion card whenever a pair qualifies** (§3).
- An undiscovered fusion card shows only `"<A> + <B> = ???"`, with no name or effect. A discovered one shows ingredients, name and effect (§4). **Discovered** means picked at least once, ever, in this browser. It is persisted at pick time.
- Fusion skills have no level. Passive mods (cooldown, area) still apply. Fusion damage follows enemy HP growth through `fusionDmg` (Task 2).
- Every fusion spawns **something new on the battlefield with its own behaviour** (§2 anti-goal). Never ship a fusion that is just an ingredient with bigger numbers.
- Damage goes only through `damageEnemy`. Screen-wide or mass-AoE hits pass `quiet: true` (v1 ruling R15).
- Storage may be null or throw. The game must play on without saving, and v1 records must survive (§7).
- Art comes only from claude-pxl, with the shared palette `art/palette.px.js`. **If pxl cannot be used, stop and ask the owner** (v1 §9).
- **Owner gate:** Lubang Hitam + Cincin Matahari visuals are shown to the owner and approved before any other fusion art is made (§9). Gameplay may use placeholders meanwhile.
- Keep 60 FPS at minute 19 with 3 fusions active (§11).

## Review Focus

1. **Saved data from v1, or a corrupt `fusions` field:** Buku Resep shows 0/15, the old bests and wins stay, and nothing throws. Pinned in Task 3.
2. **Several pending level-ups (chest) with a fusion picked mid-sequence:** the following rolls never offer the consumed ingredients or the same fusion, and the slot math stays right. Pinned in Task 1.
3. **Long Indonesian strings** ("Penghakiman Langit", "Fireball + Petir Berantai = ???") on cards, HUD panel, banner and book slots: no clipping or overlap. Pinned in Task 4 (width test) and Task 5.
4. **Storage throws on the save at pick time:** the run continues, and the fusion still counts as discovered for the rest of that page session. Pinned in Task 3.
5. **Debug grant or chest gives a fusion while its ingredients' projectiles and areas are still alive:** no crash and no orphaned skill state. Pinned in Task 2.

---

## File map

```
src/data/classes.js                 + fusions: 15 {id,a,b}; recipes removed; NAMES for 15 fusions
src/data/tuning.js                  ults -> fusions (one block per fusion id)
src/logic/progression.js            fusionFor, eligibleFusions, rollCards/applyCard for fusions; newlyUnlocked/recipeTags removed
src/logic/records.js                fusions per class: recordFusion, discoveredSet, mergeResult wins
src/game/run.js                     build.fusions, run.discovered, run.newFusions, run.found
src/game/skills/fusions/index.js    FUSIONS registry, fusionDmg, shared helpers (ready, envelope, overlay)
src/game/skills/fusions/<id>.js     one file per fusion (15)
src/game/skills/ultimates.js        deleted (its 3 ults move to fusions/hujanNeraka.js, absoluteZero.js, badaiPetir.js)
src/ui/screens.js                   fusion cards, skill-card fusion tags, result fusions, bookScreen, 4-button menu
src/ui/hud.js                       fusion slots, fusion panel, fusion banner
src/main.js                         'book' scene, discovery persistence, run seeding
src/debug.js                        F5 grant next fusion, F9 clear discoveries
src/engine/audio.js                 new fusion voices
scripts/sim.js                      fusion plans, --partitions, --nofuse
art/fx.px.js, art/ui.px.js          fusion fx (prefix fu_), 15 fusion icons + icon_unknown
test/*.test.js                      progression, records, fusions (new), ui, sim-free
```

Fusion ids, in the spec's table order (§5): `hujanNeraka` (fireball+meteor), `phoenix` (fireball+iceShard), `supernova` (fireball+frostNova), `bolaPlasma` (fireball+chainLightning), `cincinMatahari` (fireball+arcaneOrb), `kometEs` (meteor+iceShard), `gletser` (meteor+frostNova), `penghakimanLangit` (meteor+chainLightning), `lubangHitam` (meteor+arcaneOrb), `absoluteZero` (iceShard+frostNova), `pagarKristal` (iceShard+chainLightning), `pusaranKristal` (iceShard+arcaneOrb), `medanStatis` (frostNova+chainLightning), `bentengEs` (frostNova+arcaneOrb), `badaiPetir` (chainLightning+arcaneOrb).

## Model mapping

| Task | Model | Why |
|---|---|---|
| 1 Data + progression rules | sonnet | multi-file, clear spec |
| 2 Run integration, registry, port ults, placeholders | sonnet | mechanical port with clear interfaces |
| 3 Discovery records + main wiring | sonnet | standard |
| 4 Cards, HUD, banner, result | sonnet | standard UI |
| 5 Buku Resep screen + menu | sonnet | standard UI |
| 6 Sim: fusion plans | sonnet | standard |
| 7 Lubang Hitam + Cincin Matahari (art, **owner gate**) | opus | design-heavy visuals and mechanics |
| 8 Phoenix, Gletser, Pagar Kristal, Komet Es | opus | new mechanics + art |
| 9 Supernova, Bola Plasma, Penghakiman Langit, Pusaran Kristal | opus | new mechanics + art |
| 10 Medan Statis, Benteng Es, reused-3 polish | opus | new mechanics + art |
| 11 Balance pass | opus | reasoning over sim data |
| 12 Final verification + release | sonnet | checklist |
| Per-task reviews | sonnet (opus for 7–11) | |
| Final whole-branch review | opus | |

---

### Task 1: Fusion data and progression rules

**Files:**
- Modify: `src/data/classes.js`, `src/logic/progression.js`
- Test: `test/progression.test.js`

**Interfaces:**
- Produces:
  - `CLASSES.mage.fusions: {id, a, b}[]` (15, ids and pairs from the file map). `recipes` is removed.
  - `NAMES[fusionId] = {name, desc}`. Names come from §5, and each desc is one short Indonesian sentence paraphrasing the §5 row.
  - `fusionFor(classDef, x, y) -> fusionDef | undefined`: order-insensitive.
  - `eligibleFusions(build, classDef) -> {kind:'fusion', id, a, b}[]`: pairs whose both skills are in `build.skills` at 5.
  - `consumedSkills(build, classDef) -> Set<skillId>`: ingredients of `build.fusions`.
  - `build` shape becomes `{ skills, passives, fusions: [] }` (`ults` is removed).
  - `applyCard(build, card)` for `kind:'fusion'` deletes `skills[a]` and `skills[b]` and pushes `id` to `fusions`.
  - `rollCards(build, classDef, rng, n=3)`: when `eligibleFusions` is non-empty, exactly one random fusion card is placed first in the pick order. The remaining cards are drawn from skills, passives and the other fusion cards, and the final order is shuffled with `rng` (Fisher–Yates). Skill cards exclude consumed skills. A slot is full when `Object.keys(skills).length + fusions.length >= 4`. The heal fallback is unchanged.
  - `newlyUnlocked` and `recipeTags` are deleted. Leave their callers in run.js/screens.js/debug.js broken for Task 2/4 to fix, but keep `npm test` scoped to the files this task touches.

- [ ] **Step 1: Write failing tests** in `test/progression.test.js`. Replace the recipe tests:
  - `fusionFor` is order-insensitive: `fusionFor(mage,'meteor','arcaneOrb').id === 'lubangHitam'` and the same for `('arcaneOrb','meteor')`. `mage.fusions.length === 15`. Every unordered pair of `mage.skills` maps to exactly one fusion. Every fusion id has `NAMES[id].name`.
  - `eligibleFusions`: `{fireball:5, meteor:5, iceShard:4}` gives only `hujanNeraka`; `{fireball:5, meteor:5, iceShard:5}` gives 3 cards.
  - Guaranteed card: for 500 seeds with `{fireball:5, meteor:5}`, every roll contains a `kind:'fusion'` card. Over those seeds the fusion card shows up at more than one index.
  - `applyCard` fusion: skills `{fireball:5, meteor:5, iceShard:2}` give `skills = {iceShard:2}` and `fusions = ['hujanNeraka']`.
  - Slots: with `skills {iceShard:2, frostNova:1, chainLightning:1}` and `fusions ['hujanNeraka']` (4 used), 500 rolls never offer a new skill. After fusing, `fireball` and `meteor` are never offered again, even with free slots.
  - Chest sequence (Review Focus 2): skills `{fireball:5, meteor:5}`, roll, apply the fusion card, roll again, and assert no card has `id` `fireball`, `meteor` or `hujanNeraka`.
- [ ] **Step 2:** Run `node --test test/progression.test.js`. Expected: FAIL (`fusionFor` not exported).
- [ ] **Step 3:** Implement the data and functions above in `classes.js` and `progression.js`.
- [ ] **Step 4:** Run `node --test test/progression.test.js`. Expected: PASS.
- [ ] **Step 5:** Commit `feat: fusion data and progression rules`.

### Task 2: Run integration, FUSIONS registry, ported ults, placeholders, debug grant

**Files:**
- Create: `src/game/skills/fusions/index.js`, `hujanNeraka.js`, `absoluteZero.js`, `badaiPetir.js`, plus the other 12 fusion files as placeholders (see Step 3)
- Delete: `src/game/skills/ultimates.js`, `test/ultimates.test.js` (its tests move to `test/fusions.test.js`)
- Modify: `src/game/run.js`, `src/game/skills/arcaneOrb.js`, `src/data/tuning.js`, `src/debug.js`, `src/ui/hud.js` (banner source only)
- Test: `test/fusions.test.js`, `test/pickups.test.js` (chooseCard)

**Interfaces:**
- Consumes: Task 1 `applyCard`, `rollCards`, the `build.fusions` shape.
- Produces:
  - `FUSIONS: Record<fusionId, {id, update(run, st, level, mods, dt), draw?(ctx, run, st, level, assets, cam), placeholder?: true}>`. This is the same shape as the old ULTS; `level` is always 0.
  - `fusionDmg(run, base) -> number` = `base * (1 + TUNING.enemyHpGrowthPerMin * Math.floor(run.time / 60))`.
  - `ready(st, cd, mods, dt)`, `envelope(t, dur, fade)`, `overlay(ctx, color, alpha, h?, blend?)` move from ultimates.js into fusions/index.js and are exported.
  - `createRun(classId, starterSkillId, seed, assets, discovered = new Set())` stores `run.discovered = discovered`, `run.newFusions = []` (`{id, first}` items, replacing `newUlts`), `run.found = []` (ids first discovered this run) and `run.fusionState = {}` (replacing `ultState`).
  - `chooseCard` on a fusion card:
    - apply the card, then delete `run.skillState[a]` and `run.skillState[b]`
    - `first = !run.discovered.has(id)`, then `run.discovered.add(id)`
    - if `first`, push `id` to `run.found`
    - push `{id, first}` to `run.newFusions`
  - `updateRun` and `drawRun` iterate `run.build.fusions` over `FUSIONS` in place of ults.
  - `TUNING.fusions` is the old `ults` block renamed: `armageddon` becomes `hujanNeraka`, the other keys are unchanged, and each placeholder fusion gets a block `{cd, dmg, r}`.
  - `arcaneOrb.js` drops the Badai Petir charge: the orbs are consumed by that fusion now.
  - `updateBanner` reads `run.newFusions` (banner `{id, first, t}`). Visual text changes in Task 4.
  - Debug: F3 no longer unlocks anything. **F5** pushes the next `mage.fusions` id not in `build.fusions` and queues its banner (`first` from `run.discovered`; it does not persist). The key filter becomes `/^F[1-9]$/`.
- [ ] **Step 1: Write failing tests** in `test/fusions.test.js`:
  - Port the old ult tests: absoluteZero freezes only on-screen enemies, the cooldown honours `mods.cooldown`, and Hujan Neraka spawns `rate × dur` areas.
  - Every `mage.fusions` id has a `FUSIONS` module with `update`.
  - `fusionDmg` at minute 0 equals base. At `run.time = 600` it equals `base * (1 + 0.095 * 10)`, read from TUNING, not the literal.
  - Choosing a fusion card via `chooseCard`:
    - ingredients leave `build.skills` and `run.skillState`
    - `run.newFusions[0]` is `{id, first: true}` on a fresh discovered set, and `first: false` when the set already has the id
    - `run.found` lists the id only on first discovery
  - Review Focus 5:
    - set skills fireball:5 and meteor:5, step `updateRun` 2 s with enemies so fireballs and meteor areas are alive, then choose the fusion card
    - step `updateRun` 2 more seconds: no throw, the fusion fires (an enemy's hp drops), and no `skillState.fireball` exists
- [ ] **Step 2:** Run `node --test test/fusions.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implement. Placeholders: `fusions/<id>.js` for each of the 12 unbuilt fusions exports `makePlaceholder(id)` from index.js.
  - Every `cd` it hits up to 5 nearest enemies within `r` for `fusionDmg(run, dmg)`, with a `fx.burst` in palette white.
  - Each carries `placeholder: true` and a `// ponytail: placeholder until Task 7-10` comment.
- [ ] **Step 4:** Run `npm test`. Expected: all pass except UI tests that still reference recipes or ults; those are fixed in Task 4. List them in the report.
- [ ] **Step 5:** Commit `feat: fusion registry, run integration, ults ported as fusions`.

### Task 3: Discovery records and main wiring

**Files:**
- Modify: `src/logic/records.js`, `src/main.js`, `src/debug.js`
- Test: `test/records.test.js`

**Interfaces:**
- Consumes: Task 2 `createRun(..., discovered)`, `run.found`, the fusion card `{kind:'fusion', id}`.
- Produces:
  - Record shape: `records[classId].fusions = { [fusionId]: { made: number, wins: number } }`. The storage key stays `survivorsHutan.records.v1`.
  - `recordFusion(rec, classId, id) -> rec'`: pure, `made + 1`, input untouched.
  - `discoveredSet(rec, classId) -> Set<id>`: ids with `made > 0`. Tolerates a missing, non-object or array `fusions` and non-numeric entries.
  - `mergeResult(rec, classId, {time, kills, level, won, fusions = []})`: on a win, each id in `fusions` gets `wins + 1`. Otherwise unchanged.
  - main.js:
    - `starterPick` creates the run with `discoveredSet(records, classId)`.
    - `levelup`: when the chosen card is a fusion, `records = recordFusion(...)`, then `saveRecords`, before `chooseCard`.
    - `result` passes `fusions: run.build.fusions` to `mergeResult` and `{fusions: run.build.fusions, found: run.found}` to `resultScreen`.
  - Debug **F9** calls `game.clearDiscoveries()`: main.js empties `records[classId].fusions`, saves, and clears `run.discovered`.
- [ ] **Step 1: Write failing tests**:
  - `recordFusion` twice gives `made 2`, and the original object is not mutated.
  - v1-shape record `{mage:{bestTime:300,bestKills:50,bestLevel:10,wins:1}}` gives an empty `discoveredSet`, and `recordFusion` keeps the 4 bests.
  - Corrupt data: `fusions: 'x'`, `fusions: [1]` and `fusions: {lubangHitam: {made: 'a'}}` each give an empty set without throwing (Review Focus 1).
  - `mergeResult` won with `fusions ['lubangHitam']` gives `wins 1`; a loss gives `wins 0`.
  - A throwing storage: `saveRecords(throwing, recordFusion({}, 'mage', 'gletser'))` does not throw (Review Focus 4).
- [ ] **Step 2:** Run `node --test test/records.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implement records.js, main.js and debug.js.
- [ ] **Step 4:** Run `node --test test/records.test.js`. Expected: PASS.
- [ ] **Step 5:** Commit `feat: persist fusion discoveries`.

### Task 4: Cards, HUD, banner, result screen

**Files:**
- Modify: `src/ui/screens.js`, `src/ui/hud.js`, `art/ui.px.js` (temporary `icon_unknown` and placeholder fusion icons)
- Test: `test/ui.test.js`

**Interfaces:**
- Consumes: Task 1 `fusionFor`, `NAMES`; Task 2 `run.discovered`, `run.newFusions`; Task 3 `resultScreen` input.
- Produces:
  - `cardInfo(card, classDef, build, discovered = new Set())`:
    - **Fusion, undiscovered:** `{icon:'icon_unknown', name:'???', level:'Fusion!', desc:'<A> + <B> = ???', tags:[]}`.
    - **Fusion, discovered:** `{icon:'icon_'+id, name, level:'Fusion!', desc:'<A> + <B>. <desc>', tags:[]}`.
    - **Skill card tags:** one per other held unfused skill: `{text:'★ ' + (discovered ? name : '???'), unlocks: nextLevel === 5 && partner level === 5}`.
    - `levelUpScreen` passes `run.discovered`. `starterPickScreen` passes an empty build `{skills:{}, fusions:[]}`, so no tags appear.
  - HUD:
    - Skill slots show held skills, then fusions. A fusion slot is `slot_lit` with no pips.
    - `drawFusionPanel` replaces `drawRecipes`. It lists pairs of held unfused skills, sorted by combined level descending, at most 3 rows. Each row is ingredient icons with pips, then `+`, then `→`, then `icon_<id>` if discovered else `icon_unknown`. A row lights up only when both ingredients are 5. No panel when fewer than 2 unfused skills are held.
  - Banner:
    - `first` gives the title `FUSION BARU: <name>!` with the existing shake, hitstop and flash.
    - Repeat gives the title `FUSION: <name>!` with shake only.
    - The second line is the desc.
  - Result screen: res `{..., fusions: id[], found: id[]}`. The `Ultimate` row becomes `Fusion`, and ids in `found` get a blinking `Baru!`.
  - The class select desc becomes `Penyihir jarak jauh. 6 skill, 15 fusion.`
  - art: `icon_unknown` (14×14, a "?" rune in the icon style). Each fusion icon uses a plain placeholder until Tasks 7–10, for example its ingredients' colours split diagonally. Run `npm run art`.
- [ ] **Step 1: Write failing tests**, replacing the recipe-tag and ult-banner tests:
  - `cardInfo` for an undiscovered fusion has name `'???'` and desc `'Meteor + Orb Arcane = ???'`; for a discovered one, `NAMES.lubangHitam.name`.
  - Skill tags show `'★ ???'` and `'★ Lubang Hitam'` depending on `discovered`.
  - Banner order from `newFusions`, 2.5 s each.
  - Width (Review Focus 3): every fusion name has `textWidth(name) <= 76`, and every `wrapText` of each undiscovered desc at 104 px yields at most 4 lines.
- [ ] **Step 2:** Run `node --test test/ui.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm test`. Expected: all pass.
- [ ] **Step 5: Browser check.**
  - Open `/?debug`, then F3, F2, and pick a fusion card: it shows `???` the first time.
  - F9, then a new run: still `???`. A second run after picking: the name shows.
  - The HUD panel and the result screen read correctly, and the console is clean.
- [ ] **Step 6:** Commit `feat: fusion cards, HUD panel, banner and result`.

### Task 5: Buku Resep screen and menu

**Files:**
- Modify: `src/ui/screens.js`, `src/main.js`
- Test: `test/ui.test.js`

**Interfaces:**
- Consumes: Task 3 `records[classId].fusions`, `discoveredSet`.
- Produces:
  - `menuScreen` gets 4 buttons, `['Main', 'Buku Resep', 'Rekor', 'Suara: …']`, mapped to `'play' | 'book' | 'records' | 'sound'`.
  - `bookScreen(assets, classDef, record) -> {update(input) -> 'back' | null, draw(ctx)}`.
  - main.js adds scene `book`: `book: () => go('menu')`.
  - Layout:
    - title `Buku Resep`, with `Ditemukan: N/15` under it
    - a grid of 15 slots, 5 columns, roughly 88×38 each, built with `layoutCards`
    - a detail panel for the selected slot underneath
    - a `Kembali` button as the 16th picker item
  - Slot contents:
    - **Discovered:** fusion icon over its name, centred.
    - **Undiscovered:** both ingredient icons over `???`.
  - Detail panel:
    - Ingredients are always shown as `<A> + <B>`.
    - Undiscovered: `???` and `Belum ditemukan.`
    - Discovered: name, desc, `Dibuat: N`, `Menang: M`.
  - Esc returns `'back'`.
- [ ] **Step 1: Write failing tests**:
  - `bookScreen(null, mage, {fusions:{lubangHitam:{made:2,wins:1}}})` exposes `found === 1`.
  - Esc gives `'back'`. Selecting the 16th item and pressing Enter gives `'back'`.
  - Enter on a slot gives `null`.
  - A v1-shape record yields `found === 0`.
- [ ] **Step 2:** Run `node --test test/ui.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5: Browser check.** Menu → Buku Resep: keyboard and mouse navigation, the longest names fit their slots, Esc and Kembali work, and the console is clean.
- [ ] **Step 6:** Commit `feat: Buku Resep page`.

### Task 6: Simulator fusion plans

**Files:**
- Modify: `scripts/sim.js`

**Interfaces:**
- Consumes: Tasks 1–2 fusion cards and `build.fusions`.
- Produces CLI:
  - `--plan "fireball+meteor,iceShard+frostNova|none"`: each plan is an ordered list of pairs.
    - The bot's starter is the first pair's first skill.
    - It levels the current pair's skills, then passives (existing order).
    - It takes a fusion card only for the current planned pair, then moves to the next pair.
    - It never takes an unplanned fusion card. `none` picks randomly but never a fusion card.
  - `--partitions`: runs all 15 three-pair builds (the perfect matchings of the 6 skills), each at `--seeds`. It prints each build's win rate, then a per-fusion table: the average win rate over the 3 builds containing it, sorted. The last line is `weakest/strongest = x.xx`.
  - `--nofuse`: the bot reaches each planned pair at Lv5 but never takes the fusion card. This is for the §6 "fusion beats its ingredients" check.
  - Report lines replace `ult1/ult2` with `fusion1/2/3 <minute> (n/seeds)`.
- [ ] **Step 1:** Implement.
- [ ] **Step 2:** Run `node scripts/sim.js --plan "meteor+arcaneOrb" --seeds 2 --verbose`. Expected: a report line, and the verbose line shows `lubangHitam` built (fusion1 minute present).
- [ ] **Step 3:** Run `node scripts/sim.js --partitions --seeds 1 --max 300`. Expected: 15 build lines, a 15-row fusion table, and a `weakest/strongest` line.
- [ ] **Step 4:** Update the usage comment at the top of sim.js and the `survivors-hutan-workflow` memory line (the controller does the memory).
- [ ] **Step 5:** Commit `tools: sim plans by fusion pair`.

### Task 7: Lubang Hitam and Cincin Matahari (**owner gate**)

**Files:**
- Modify: `src/game/skills/fusions/lubangHitam.js`, `cincinMatahari.js`, `src/data/tuning.js`, `src/engine/audio.js`, `art/fx.px.js` (sprites prefixed `fu_`; add `"fu_*"` to the `sheet("fx", …)` list), `art/ui.px.js` (real icons)
- Test: `test/fusions.test.js`

**Behaviour (§5):**
- **Lubang Hitam:** every `cd`, a black hole opens at `densestPoint`.
  - For `pull` seconds it drags enemies within `r` toward its centre (bosses by their `knock` share) and hurts lightly.
  - Then it collapses with a big blast (`quiet`, `fusionDmg`).
  - Visuals: swirling dark core with an accretion ring, screen shake on collapse.
- **Cincin Matahari:** `n` small suns orbit the mage.
  - Contact burns.
  - Each sun fires a fireball outward every `fireEvery` seconds, aimed at the nearest enemy in its outward half-plane, or radially if there is none.
  - Visuals: bright gold, glow, ember trail.
- Both have distinct cast SFX (new `VOICES` entries and `DUR` keys).

- [ ] **Step 1: Write failing tests:**
  - Lubang Hitam: an enemy 40 px from the hole ends closer after 0.5 s of updates; after `pull` it takes collapse damage `>= fusionDmg(run, collapseDmg)` (frozenVuln off).
  - Cincin Matahari: after 3 s, `run.projectiles` holds fireballs that the suns launched, and an enemy touching a sun's orbit position takes damage.
  - Both modules lack `placeholder`.
- [ ] **Step 2:** Run `node --test test/fusions.test.js`. Expected: FAIL.
- [ ] **Step 3:** Draw the art with the pxl workflow (write, build, preview, fix). Then implement the behaviour and tuning.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** In the browser with `/?debug`, F5 grants these two fusions. Capture screenshots or a short GIF of each in a crowd at minute ~12 (F1). Check FPS with F4.
- [ ] **Step 6:** Commit `feat: Lubang Hitam and Cincin Matahari`.
- [ ] **Step 7: OWNER GATE.** Hard stop. The controller shows the owner the captures and waits for approval or changes. No other fusion art starts before approval. Tasks 3–6 and 11's tooling may proceed.

### Task 8: Phoenix Api-Es, Gletser, Pagar Kristal, Komet Es

Same files pattern and steps as Task 7, one module per fusion, and no hard gate. The captures go to the owner at the end of the task, and change requests fold into the next task.

**Behaviour (§5), with each signature test as Step 1:**
- **Phoenix:** a bird loops around the mage.
  - Its two wings leave fire and ice trail areas (burn / slow).
  - Every `diveEvery` seconds it dives through `densestPoint` and explodes.
  - Test: trail areas exist after 2 s, and an enemy at `densestPoint` takes dive damage.
- **Gletser:** a giant ice block lands at a crowd edge and slides straight across the view, hitting each enemy once per pass and freezing it.
  - Test: enemies on its lane take damage and get `frozenUntil > run.time`, and an enemy off the lane is untouched.
- **Pagar Kristal:** shards lodge as crystals (max `maxCrystals`, lifetime `life`).
  - Crystals within `link` px of each other arc together, and enemies crossing a link take `tickDmg` every `tick`.
  - Test: two crystals 40 px apart damage an enemy standing on the segment between them, not one 30 px off it.
- **Komet Es:** an ice comet falls (warn, then impact) and freezes the area.
  - It then bursts into `shards` projectiles radially.
  - Test: impact freezes the enemies in `r`, then `shards` projectiles spawn.

Commit `feat: Phoenix, Gletser, Pagar Kristal, Komet Es`.

### Task 9: Supernova, Bola Plasma, Penghakiman Langit, Pusaran Kristal

Same pattern as Task 8.
- **Supernova:** an expanding fire ring from the mage leaves burning ground along the ring.
  - Test: an enemy at radius 60 is hit when the front passes, and a burn area exists afterward.
- **Bola Plasma:** a big slow orb travels toward `densestPoint`, zapping every enemy within `zapR` every `zapEvery` along the way, and pops at the end.
  - Test: two enemies near its path both take zap damage before it arrives.
- **Penghakiman Langit:** `pillars` lightning pillars strike random on-screen points (with warn), each chaining `jumps` (reuse `strike`/`chainTargets` from chainLightning.js).
  - Test: with N enemies, more than `pillars` enemies are damaged in one cast when chains connect.
- **Pusaran Kristal:** ice blades orbit (like orbs) and spray ice shards outward continuously, with slow and pierce.
  - Test: shard projectiles spawn over time with `slow`, and a blade contact deals damage.

Commit `feat: Supernova, Bola Plasma, Penghakiman Langit, Pusaran Kristal`.

### Task 10: Medan Statis, Benteng Es, and the reused three

Same pattern as Task 8.
- **Medan Statis:** a pulsing electric aura (radius `r`) zaps enemies inside every `pulse`.
  - Frozen enemies anywhere in view conduct: each pulse also arcs from every frozen enemy to its nearest unfrozen neighbour within `arc` px.
  - Test: a frozen enemy outside `r` with a neighbour 30 px away makes that neighbour take damage.
- **Benteng Es:** a tight ring of ice segments rotates around the mage. Contact freezes, and every `burstEvery` the ring blasts outward to `burstR`.
  - Test: a touching enemy is frozen, and an enemy at `burstR - 5` is hit only by the burst.
- **Reused three:**
  - Rename `icon_armageddon` to `icon_hujanNeraka` (art and every reference).
  - Hujan Neraka, Absolute Zero and Badai Petir get real fusion icons and keep their v1 fx.
  - Badai Petir no longer needs orbs, so it gets a visible storm core orbiting with the cloud.
- Add a test that **no `FUSIONS` module has `placeholder`**, and delete `makePlaceholder`.

Commit `feat: Medan Statis, Benteng Es, finish fusion set`.

### Task 11: Balance pass

**Files:**
- Modify: `src/data/tuning.js`, `src/data/spawns.js` if needed (§6 allows enemy numbers to move, as long as the swarm is dense from the start, the mage dies easily and heals stay rare)

- [ ] **Step 1:** Run `node scripts/sim.js --partitions --seeds 6` in the background, plus `--plan "<pair>"` vs `--plan "<pair>" --nofuse` for every pair (`--seeds 4`).
- [ ] **Step 2:** Tune until all of these hold:
  - every pair fused survives at least as long as `--nofuse`
  - `weakest/strongest >= 0.5`
  - bot win rates: 1 fusion ~0%, 2 fusions ~20–40%, 3 fusions ~50%+
  - fusion1 at about minute 7–10, fusion2 at 12–15, fusion3 before 20:00
- [ ] **Step 3:** Run `npm test`. Expected: PASS.
- [ ] **Step 4:** Commit `balance: fusion pass`, with the sim summary in the message body.

### Task 12: Final verification and release

- [ ] **Step 1:** Run `npm test`. Expected: all pass.
- [ ] **Step 2:** Run `grep -rn "ult\b\|ults\|recipe\|newUlts\|ultState" src scripts` and confirm only intentional hits remain (e.g. `fx_ultFlash`, `ult_banner`, sfx `'ult'`).
- [ ] **Step 3: Browser check.**
  - At `/?debug`, F8, F5 ×3 (three fusions), F4: FPS holds at the minute 19 crowd and the console is clean.
  - Full flow: menu → Buku Resep → play → fusion `???` → result `Baru!` → Buku Resep shows it.
- [ ] **Step 4:** Run `npm run release` and confirm `dist/survivors-hutan.zip` excludes `src/debug.js`.
- [ ] **Step 5:** Commit if anything changed.
