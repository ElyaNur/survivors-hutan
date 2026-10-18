import { test } from 'node:test'; import assert from 'node:assert/strict';
import TUNING from '../src/data/tuning.js';
import { createRun, updateRun } from '../src/game/run.js';
import { spawnEnemy, damageEnemy } from '../src/game/enemies.js';
import { SKILLS } from '../src/game/skills/index.js';
import { FUSIONS, fusionDmg } from '../src/game/skills/fusions/index.js';
import { chooseCard } from '../src/game/run.js';
import { CLASSES } from '../src/data/classes.js';
import { updateBanner } from '../src/ui/hud.js';

const U = TUNING.fusions;
const spyFx = () => {
  const anims = [];
  return { anims, number() {}, anim(x, y, name) { anims.push(name); }, burst() {}, hitstop() {}, flashScreen() {}, shake() {},
    update() {}, frozen: () => false };
};
const still = { moveVector: () => ({ x: 0, y: 0 }), pressed: () => false };
function setup() {
  const run = createRun('mage', 'fireball', 1); run.fx = spyFx();
  run.build.skills = {};                                    // no skills: only the fusion hurts the test's enemies
  return run;
}
const tank = (run, dx, dy = 0) => { const e = spawnEnemy(run, 'orc', run.player.x + dx, run.player.y + dy); e.hp = e.maxHp = 1e6; return e; };

test('fusion fires on pick (through updateRun), then again only after cd x mods.cooldown', () => {
  const run = setup(), e = tank(run, 40);
  run.player.hp = 1e9;                                          // the orc's blows must not end the run (Task 12) mid-test
  run.mods.cooldown = 0.5;
  run.build.fusions.push('absoluteZero');
  updateRun(run, 0.01, still);
  const hit1 = e.maxHp - e.hp;
  assert.ok(hit1 > 0, 'fired on the first step after the unlock');
  for (let t = 0; t < U.absoluteZero.cd * 0.5 - 0.1; t += 0.05) updateRun(run, 0.05, still);
  assert.equal(e.maxHp - e.hp, hit1, 'not again before cd');
  for (let i = 0; i < 4; i++) updateRun(run, 0.05, still);
  assert.ok(e.maxHp - e.hp > hit1, 'again once cd x mods.cooldown is up');
});

test('Absolute Zero freezes and exposes only on-screen enemies, and hits them', () => {
  const run = setup(), on = tank(run, 100, 50), off = tank(run, 400);
  FUSIONS.absoluteZero.update(run, {}, 0, run.mods, 0.01);
  const until = run.time + U.absoluteZero.freeze;
  assert.equal(on.frozenUntil, until); assert.equal(on.vulnerableUntil, until);
  assert.equal(on.maxHp - on.hp, U.absoluteZero.hitDmg * TUNING.frozenVulnMult, 'the blast lands on frozen ice');
  assert.equal(off.frozenUntil, 0); assert.equal(off.vulnerableUntil, 0); assert.equal(off.hp, off.maxHp);
});

test('an enemy killed while vulnerable shatters; a normal kill poofs', () => {
  const run = setup(), a = spawnEnemy(run, 'slime', 0, 0), b = spawnEnemy(run, 'slime', 0, 0);
  a.vulnerableUntil = run.time + 1;
  damageEnemy(run, a, 999); damageEnemy(run, b, 999);
  assert.ok(run.fx.anims.includes('fx_shatter'));
  assert.equal(run.fx.anims.filter(n => n === 'fx_poof').length, 1, 'only the plain kill poofs');
});

test('Badai Petir: active for dur, then off; strikes enemies within range', () => {
  const run = setup(), near = tank(run, 60), st = run.fusionState.badaiPetir = {};
  for (let t = 0; t < U.badaiPetir.dur - 0.1; t += 0.05) FUSIONS.badaiPetir.update(run, st, 0, run.mods, 0.05);
  assert.equal(st.active, true);
  assert.ok(near.hp < near.maxHp, 'struck');
  for (let i = 0; i < 4; i++) FUSIONS.badaiPetir.update(run, st, 0, run.mods, 0.05);
  assert.equal(st.active, false);
});

test('Hujan Neraka drops rate x dur meteors over dur, then stops', () => {
  const run = setup(), st = {};
  for (let t = 0; t < U.hujanNeraka.dur + 1; t += 0.05) FUSIONS.hujanNeraka.update(run, st, 0, run.mods, 0.05);
  assert.equal(run.areas.length, U.hujanNeraka.rate * U.hujanNeraka.dur);
});

test('a fusion banner shakes and holds the world for a beat, and carries {id, first}', () => {
  const run = createRun('mage', 'fireball', 1);
  run.newFusions.push({ id: 'hujanNeraka', first: true });
  updateBanner(run, 0.016);
  assert.equal(run.fx.frozen(), true);
  assert.equal(run.banner.id, 'hujanNeraka'); assert.equal(run.banner.first, true);
});

test('every mage fusion has a FUSIONS module with update; unbuilt ones are flagged placeholder', () => {
  for (const f of CLASSES.mage.fusions) assert.equal(typeof FUSIONS[f.id]?.update, 'function', f.id);
  assert.equal(Object.keys(FUSIONS).length, CLASSES.mage.fusions.length);
  assert.ok(FUSIONS.phoenix.placeholder); assert.ok(!FUSIONS.hujanNeraka.placeholder);
});

test('placeholder hits the 5 nearest enemies within r, on cd', () => {
  const run = setup(), st = {}, F = U.phoenix;
  const es = [10, 20, 30, 40, 50, 60].map(d => tank(run, d)), far = tank(run, F.r + 50);
  FUSIONS.phoenix.update(run, st, 0, run.mods, 0.01);
  assert.deepEqual(es.map(e => e.hp < e.maxHp), [true, true, true, true, true, false]);
  assert.equal(far.hp, far.maxHp);
  const hp = es[0].hp;
  FUSIONS.phoenix.update(run, st, 0, run.mods, 0.01);
  assert.equal(es[0].hp, hp, 'not again before cd');
});

test('fusionDmg grows with the minute like enemy hp', () => {
  const run = setup();
  assert.equal(fusionDmg(run, 40), 40);
  run.time = 600;
  assert.equal(fusionDmg(run, 40), 40 * (1 + TUNING.enemyHpGrowthPerMin * 10));
});

const fusionCard = { kind: 'fusion', id: 'hujanNeraka', a: 'fireball', b: 'meteor' };
const fused = discovered => {
  const run = createRun('mage', 'fireball', 1, null, discovered); run.fx = spyFx();
  run.build.skills = { fireball: 5, meteor: 5 }; run.skillState.fireball = {}; run.skillState.meteor = {};
  run.pendingLevelUps = 1; run.state = 'levelup';
  chooseCard(run, fusionCard);
  return run;
};

test('choosing a fusion card consumes the ingredients and queues the banner', () => {
  const run = fused(new Set());
  assert.deepEqual(run.build.skills, {}); assert.deepEqual(run.build.fusions, ['hujanNeraka']);
  assert.deepEqual(run.skillState, {});
  assert.deepEqual(run.newFusions, [{ id: 'hujanNeraka', first: true }]);
  assert.deepEqual(run.found, ['hujanNeraka']);
  assert.ok(run.discovered.has('hujanNeraka'));
  assert.equal(run.state, 'playing');
});

test('an already discovered fusion is not first and not found again', () => {
  const run = fused(new Set(['hujanNeraka']));
  assert.deepEqual(run.newFusions, [{ id: 'hujanNeraka', first: false }]);
  assert.deepEqual(run.found, []);
});

test('Review Focus 5: fusing with live fireballs and meteors in flight neither throws nor revives the skill', () => {
  const run = createRun('mage', 'fireball', 1); run.fx = spyFx();
  run.build.skills = { fireball: 5, meteor: 5 };
  run.player.hp = 1e9;
  const e = tank(run, 60);
  for (let t = 0; t < 2; t += 0.05) updateRun(run, 0.05, still);
  assert.ok(run.projectiles.length + run.areas.length > 0, 'something is in flight');
  run.pendingLevelUps = 1; run.state = 'levelup';
  chooseCard(run, fusionCard);
  for (let t = 0; t < 2; t += 0.05) updateRun(run, 0.05, still);
  assert.ok(run.fusionState.hujanNeraka.n > 0, 'the fusion fires');
  assert.equal(run.skillState.fireball, undefined);
  assert.equal(run.skillState.meteor, undefined);
});

import { spawnArea, updateProjectiles } from '../src/game/projectiles.js';
const counting = run => { run.fx.nums = 0; run.fx.number = () => run.fx.nums++; return run; };
const crowdAt = (run, n, dx) => Array.from({ length: n }, () => { const e = tank(run, dx); run.grid.insert(e); return e; });

test('quiet big hits share the number budget: an ult blast never floods the screen', () => {
  const run = counting(setup());
  for (const e of crowdAt(run, 50, 60)) damageEnemy(run, e, 60, { quiet: true });
  assert.ok(run.fx.nums <= TUNING.fx.numberBudget.burst, `${run.fx.nums} numbers`);
  const loud = counting(setup());
  for (const e of crowdAt(loud, 3, 60)) damageEnemy(loud, e, 60);
  assert.equal(loud.fx.nums, 3, 'a lone big hit still always prints');
});

test('Absolute Zero and Hujan Neraka blasts hit quietly', () => {
  const az = counting(setup());
  crowdAt(az, 50, 60);
  FUSIONS.absoluteZero.update(az, {}, 0, az.mods, 0.01);
  assert.ok(az.fx.nums <= TUNING.fx.numberBudget.burst, `${az.fx.nums} numbers`);
  const arm = counting(setup());
  FUSIONS.hujanNeraka.update(arm, {}, 0, arm.mods, 0.01);
  const a = arm.areas[0];
  crowdAt(arm, 50, a.x - arm.player.x).forEach(e => { e.y = a.y; });
  arm.grid.clear(); for (const e of arm.enemies) arm.grid.insert(e);
  updateProjectiles(arm, U.hujanNeraka.warn + 0.01);
  assert.ok(arm.enemies.filter(e => e.hp < e.maxHp).length >= 50, 'the blast landed');
  assert.ok(arm.fx.nums <= TUNING.fx.numberBudget.burst, `${arm.fx.nums} numbers`);
});

test('the Meteor skill blast is mass AoE too: it hits quietly', () => {
  const run = setup(); tank(run, 60);
  SKILLS.meteor.update(run, {}, 5, run.mods, 0.01);
  assert.ok(run.areas.length > 0 && run.areas.every(a => a.quiet));
});
