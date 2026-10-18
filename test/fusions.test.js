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

test('every mage fusion has a real FUSIONS module with update (no placeholder left)', () => {
  for (const f of CLASSES.mage.fusions) assert.equal(typeof FUSIONS[f.id]?.update, 'function', f.id);
  assert.equal(Object.keys(FUSIONS).length, CLASSES.mage.fusions.length);
  for (const [id, m] of Object.entries(FUSIONS)) assert.ok(!('placeholder' in m), id);
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

const regrid = run => { run.grid.clear(); for (const e of run.enemies) run.grid.insert(e); };
const step = (run, id, st, secs, dt = 0.05) => { for (let t = 0; t < secs - 1e-9; t += dt) { regrid(run); FUSIONS[id].update(run, st, 0, run.mods, dt); } };

test('Lubang Hitam drags an enemy in for pull s, then collapses with a fusionDmg blast', () => {
  const run = setup(), st = {}, L = U.lubangHitam;
  FUSIONS.lubangHitam.update(run, st, 0, run.mods, 0.01);    // opens at once (empty view: on the mage)
  const e = tank(run, 0); e.x = st.x + 40; e.y = st.y;
  step(run, 'lubangHitam', st, 0.5);
  assert.ok(Math.hypot(e.x - st.x, e.y - st.y) < 40, 'pulled closer');
  const before = e.maxHp - e.hp;
  step(run, 'lubangHitam', st, L.pull);
  assert.ok(e.maxHp - e.hp - before >= fusionDmg(run, L.collapseDmg), 'the collapse landed');
});

test('Cincin Matahari: the suns launch fireballs, and a sun burns what it touches', () => {
  const run = setup(), st = {};
  step(run, 'cincinMatahari', st, 3);
  assert.ok(run.projectiles.length >= 2 && run.projectiles.every(p => p.sprite === 'fireball_fly'), 'fireballs from the suns (no skills held)');
  const C = U.cincinMatahari, R = C.orbitR * run.mods.area;
  const e = tank(run, 0); e.x = run.player.x + Math.cos(st.angle) * R; e.y = run.player.y + Math.sin(st.angle) * R;
  step(run, 'cincinMatahari', st, 0.05);
  assert.ok(e.hp < e.maxHp, 'burned on contact');
});

test('Lubang Hitam keeps one hole at a time: a cd that runs out mid-pull does not reopen it', () => {
  const run = setup(), st = {};
  FUSIONS.lubangHitam.update(run, st, 0, run.mods, 0.01);
  st.cd = -1;                                               // as if the cd were shorter than the pull
  step(run, 'lubangHitam', st, 0.5);
  assert.ok(Math.abs(st.t - 0.5) < 1e-6, 'the open hole kept its clock');
});

import { drawRun } from '../src/game/run.js';
test('a fusion with only drawTop draws on the frame it is picked, before any update', () => {
  const stub = () => new Proxy(function () {}, { get: (o, k) => k === Symbol.toPrimitive ? () => 0 : (k in o ? o[k] : stub()),
    set: (o, k, v) => (o[k] = v, true), apply: () => stub() });   // any canvas / ctx call, any property
  const hadDoc = 'document' in globalThis, doc = globalThis.document;
  globalThis.document = { createElement: () => stub() };
  try {
    const run = createRun('mage', 'fireball', 1); run.build.fusions = ['cincinMatahari'];
    const assets = { draw() {}, drawSlice() {}, animTotal: () => 500, has: () => true, size: () => ({ w: 16, h: 16 }) };
    assert.doesNotThrow(() => drawRun(stub(), run, assets));
    assert.equal(typeof run.fusionState.cincinMatahari, 'object');
  } finally { if (hadDoc) globalThis.document = doc; else delete globalThis.document; }
});

// The fusion plus the projectiles and areas it spawns, with the clock running (freezes and slows are timed).
const live = (run, id, st, secs, dt = 0.05) => {
  for (let t = 0; t < secs - 1e-9; t += dt) { regrid(run); FUSIONS[id].update(run, st, 0, run.mods, dt); updateProjectiles(run, dt); run.time += dt; }
};

test('Phoenix: its wings leave fire and ice trails, and it dives into the densest crowd and blows up', () => {
  const run = setup(), st = {}, P = U.phoenix;
  const e = tank(run, Math.ceil(P.loopR + P.span + P.trailR) + 20);   // beyond the loop and its trails: only the dive reaches it
  live(run, 'phoenix', st, 2);
  assert.ok(run.areas.some(a => a.dmg > 0 && a.dur > 0), 'a burning trail');
  assert.ok(run.areas.some(a => a.slow > 0 && a.dur > 0), 'an icy trail');
  assert.equal(e.hp, e.maxHp, 'no dive yet');
  live(run, 'phoenix', st, P.diveEvery);
  assert.ok(e.maxHp - e.hp >= fusionDmg(run, P.diveDmg), 'the dive blast landed');
});

test('Gletser: the block runs over and freezes every enemy on its lane, nothing off it', () => {
  const run = setup(), st = {}, G = U.gletser;
  const lane = [60, 90, 90, 120, -60, -120].map(dx => tank(run, dx, 40));   // a row of the crowd 40 px below the mage
  const off = tank(run, 100, -60);
  live(run, 'gletser', st, G.warn + G.slide / G.speed + 0.5);
  for (const e of lane) { assert.ok(e.hp < e.maxHp, 'run over'); assert.ok(e.frozenUntil >= G.warn + G.freeze - 1e-6, 'frozen when hit'); }   // every hit comes after the landing
  assert.equal(off.hp, off.maxHp); assert.equal(off.frozenUntil, 0);
});

test('Pagar Kristal: two crystals 40 px apart zap an enemy on the link between them, not one 30 px off it', () => {
  const run = setup(), K = U.pagarKristal, p = run.player;
  const st = { cd: 1e9, crystals: [{ x: p.x + 60, y: p.y, age: 0 }, { x: p.x + 100, y: p.y, age: 0 }] };   // no new shards
  const on = tank(run, 80), off = tank(run, 80, 30);
  live(run, 'pagarKristal', st, K.tick * 2 + 0.01);
  assert.ok(on.hp < on.maxHp, 'zapped on the link');
  assert.equal(off.hp, off.maxHp);
});

test('Pagar Kristal: shards lodge as crystals, never more than maxCrystals, each gone after life', () => {
  const run = setup(), st = {}, K = U.pagarKristal;
  run.mods.cooldown = 0.01;                                 // a throw every step
  const flight = K.throwR * run.mods.area / K.shardSpeed;   // the longest a shard flies before it lodges
  live(run, 'pagarKristal', st, (K.maxCrystals + 3) * 0.05 + flight);
  assert.equal(st.crystals.length, K.maxCrystals);
  st.cd = 1e9;                                              // no more throws (the last ones in flight still lodge)
  live(run, 'pagarKristal', st, flight + K.life + 0.1);
  assert.equal(st.crystals.length, 0, 'expired');
});

test('Komet Es: the impact freezes the crowd within r, then the comet bursts into shards', () => {
  const run = setup(), st = {}, K = U.kometEs, dt = 0.05;
  const crowd = [0, 8, -8].map(dy => tank(run, 90, dy)), far = tank(run, -150);
  let t = 0;
  for (; t < K.warn + K.shatter + 1 && !run.projectiles.length; t += dt) {
    regrid(run); FUSIONS.kometEs.update(run, st, 0, run.mods, dt);
    if (run.projectiles.length) break;                      // counted before they fly off and pierce out
    updateProjectiles(run, dt); run.time += dt;
    if (!crowd[0].frozenUntil) assert.equal(run.projectiles.length, 0);
  }
  for (const e of crowd) assert.ok(e.frozenUntil > run.time, 'frozen first');
  assert.equal(far.frozenUntil, 0, 'only within r');
  assert.equal(run.projectiles.length, K.shards, 'then the shards');
});

test('Supernova: the fire ring hits an enemy at radius 60 as its front passes, and leaves burning ground', () => {
  const run = setup(), st = {}, S = U.supernova, e = tank(run, 60), dt = 0.02;
  assert.ok(S.r * run.mods.area > 60 + e.r, 'the ring reaches it');
  let at = null;
  for (let t = 0; t < S.expand + 0.1 && at === null; t += dt) { live(run, 'supernova', st, dt, dt); if (e.hp < e.maxHp) at = st.R; }
  assert.ok(at !== null, 'hit');
  assert.ok(at >= 60 - e.r - 1e-6, `hit by the front (front at ${at})`);
  assert.ok(e.maxHp - e.hp >= fusionDmg(run, S.dmg), 'the front landed');
  live(run, 'supernova', st, S.expand);
  assert.ok(run.areas.some(a => a.dmg > 0 && a.dur > 0 && Math.abs(Math.hypot(a.x - run.player.x, a.y - run.player.y) - 60) <= S.burnGap),
    'burning ground along the ring');
});

test('Bola Plasma: the orb zaps both enemies near its path before it reaches the crowd, then pops', () => {
  const run = setup(), st = {}, B = U.bolaPlasma, p = run.player;
  const crowd = [0, 4, -4, 8].map(dy => tank(run, 200, dy)), path = [tank(run, 70, 12), tank(run, 120, -12)];
  for (let t = 0; t < 10 && !(st.x - p.x > 120 + B.zapR * run.mods.area); t += 0.05) live(run, 'bolaPlasma', st, 0.05);
  assert.ok(st.on, 'still flying');
  for (const e of path) assert.ok(e.maxHp - e.hp >= fusionDmg(run, B.zapDmg), 'zapped on the way');
  live(run, 'bolaPlasma', st, 200 / B.speed);
  assert.ok(!st.on, 'popped');
  for (const e of crowd) assert.ok(e.maxHp - e.hp >= fusionDmg(run, B.popDmg), 'the pop landed');
});

test('Penghakiman Langit: after the warning, the pillars chain on to more enemies than there are pillars', () => {
  const run = setup(), st = {}, L = U.penghakimanLangit;
  const es = [tank(run, -150, -30)], gap = Math.ceil(L.r * run.mods.area + es[0].r) + 2;   // a pillar on one tank never reaches the next
  assert.ok(gap <= L.jumpRange, 'the chain can jump the gap');
  for (let i = 0; i < 10; i++) for (const dy of [-30, 30]) if (i || dy > 0) es.push(tank(run, -150 + i * gap, dy));
  live(run, 'penghakimanLangit', st, L.warn * 0.9);
  assert.ok(es.every(e => e.hp === e.maxHp), 'warned first');
  live(run, 'penghakimanLangit', st, L.warn * 0.1 + L.pillars * L.stagger + 0.1);
  const hit = es.filter(e => e.hp < e.maxHp).length;
  assert.ok(hit > L.pillars, `${hit} enemies hit by ${L.pillars} pillars`);
});

test('Pusaran Kristal: the blades keep spraying slowing, piercing shards, and cut what they touch', () => {
  const run = setup(), st = {}, K = U.pusaranKristal;
  live(run, 'pusaranKristal', st, 1);
  assert.ok(run.projectiles.length >= K.n, 'shards out');
  assert.ok(run.projectiles.every(q => q.slow === K.slow && q.pierce > 0 && q.sprite === 'iceShard_fly'));
  const n1 = st.sprayed;
  live(run, 'pusaranKristal', st, 1);
  assert.ok(st.sprayed > n1, 'still spraying');
  const R = K.orbitR * run.mods.area, e = tank(run, 0);
  e.x = run.player.x + Math.cos(st.angle) * R; e.y = run.player.y + Math.sin(st.angle) * R;
  regrid(run); FUSIONS.pusaranKristal.update(run, st, 0, run.mods, 0.001);
  assert.ok(e.maxHp - e.hp >= fusionDmg(run, K.dmg), 'cut on contact');
});

test('Medan Statis: the aura zaps and freezes what is inside r, and a frozen enemy outside it arcs to its neighbour', () => {
  const run = setup(), st = {}, M = U.medanStatis, R = M.r * run.mods.area;
  const inside = tank(run, R * 0.5), d = Math.ceil(R + inside.r) + 2;
  const cond = tank(run, d), nb = tank(run, d + 30), lone = tank(run, d + 30 + M.arc + 20);
  cond.frozenUntil = 1e9;                                   // frozen by something else, out of the aura's reach
  assert.ok(M.arc >= 30 && d + 30 > R + nb.r, 'only the conductor can reach the neighbour');
  live(run, 'medanStatis', st, 0.05);
  assert.ok(inside.maxHp - inside.hp >= fusionDmg(run, M.dmg), 'zapped by the pulse'); assert.ok(inside.frozenUntil > run.time, 'and frozen');
  assert.ok(nb.maxHp - nb.hp >= fusionDmg(run, M.arcDmg), 'the frozen enemy conducted');
  assert.equal(lone.hp, lone.maxHp, 'beyond arc of every conductor'); assert.equal(cond.hp, cond.maxHp, 'the conductor itself is spared');
  const hp = nb.hp;
  live(run, 'medanStatis', st, M.pulse * run.mods.cooldown - 0.1);
  assert.equal(nb.hp, hp, 'not again before the next pulse');
  live(run, 'medanStatis', st, 0.15);
  assert.ok(nb.hp < hp, 'the next pulse conducts again');
});

test('Benteng Es: the ring freezes what touches it, and only its burst reaches burstR', () => {
  const run = setup(), st = {}, K = U.bentengEs, R = K.ringR * run.mods.area, BR = K.burstR * run.mods.area;
  const touch = tank(run, R), far = tank(run, BR - 5);
  assert.ok(R + K.thick + far.r < BR - 5, 'the ring itself cannot reach it');
  live(run, 'bentengEs', st, 0.05);
  assert.ok(touch.frozenUntil > run.time, 'frozen on contact'); assert.ok(touch.hp < touch.maxHp, 'and hurt');
  live(run, 'bentengEs', st, K.burstEvery * run.mods.cooldown - 0.2);
  assert.equal(far.hp, far.maxHp, 'no burst yet');
  live(run, 'bentengEs', st, 0.2 + K.burstTime + 0.15);
  assert.ok(far.maxHp - far.hp >= fusionDmg(run, K.burstDmg), 'the burst reached it');
  assert.ok(!st.on, 'the burst is over and the ring stands again');
});

test('Badai Petir: its storm core keeps striking the nearest enemy between storms', () => {
  const run = setup(), B = U.badaiPetir, st = { cd: 1e9 };  // no storm
  const e = tank(run, B.coreRange * 0.5);
  live(run, 'badaiPetir', st, B.coreEvery + 0.05);
  assert.ok(!st.active); assert.ok(e.maxHp - e.hp >= fusionDmg(run, B.coreDmg), 'struck by the core');
});

test('the reused three hit with fusionDmg: they grow with the minute', () => {
  const run = setup(); run.time = 600;
  const e = tank(run, 100, 50);
  FUSIONS.absoluteZero.update(run, {}, 0, run.mods, 0.01);
  assert.equal(e.maxHp - e.hp, Math.round(fusionDmg(run, U.absoluteZero.hitDmg) * TUNING.frozenVulnMult));
  FUSIONS.hujanNeraka.update(run, {}, 0, run.mods, 0.01);
  assert.equal(run.areas[0].dmg, fusionDmg(run, U.hujanNeraka.dmg));
  const b = setup(); b.time = 600; const t = tank(b, 60), st = {};
  FUSIONS.badaiPetir.update(b, st, 0, b.mods, 0.01);
  assert.ok(t.maxHp - t.hp >= fusionDmg(b, U.badaiPetir.dmg), 'the storm bolt');
  assert.equal(U.badaiPetir.orbBoost, undefined);
});
