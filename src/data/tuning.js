// Starting guesses (tuned later). Per-level skill values: number | {base, perLv} | 5-array (lv1..lv5).
const TUNING = {
  player: { hp: 100, speed: 60, iframes: 0.6, magnet: 32, pickup: 8, size: 12 },   // size: hitbox diameter (sprite is 17 wide)
  frozenVulnMult: 2,
  xp: { base: 5, step1: 10, step2: 40, step3: 160 },
  cards: { heldSkillWeight: 2.5 },   // level-up draw weight of a held skill's next level (every other card 1)
  enemyHpGrowthPerMin: 0.15,
  fusionDmgMult: 1.3,   // every fusion damage number x this (and x the enemy hp growth by minute)
  maxEnemies: 400,
  enemyCullDist: 700,   // farther than this from the player -> moved back to just off-screen
  enemies: {
    slime:    { hp: 6,    speed: 30, dmg: 6,  xp: 1,  size: 12 },
    bat:      { hp: 4,    speed: 56, dmg: 3,  xp: 1,  size: 10, wobble: 0.9, wobbleRate: 7 },
    slimeRed: { hp: 18,   speed: 38, dmg: 10,  xp: 1.5,  size: 12 },
    goblin:   { hp: 18,   speed: 45, dmg: 8,  xp: 1.5,  size: 14 },
    wolf:     { hp: 25,   speed: 85, dmg: 15, xp: 2,  size: 16, reaim: 2 },
    orc:      { hp: 80,   speed: 28, dmg: 33, xp: 3,  size: 18 },
    witch:    { hp: 30,   speed: 35, dmg: 18,  xp: 2.5,  size: 14, keepDist: 110, shotEvery: 3, shotSpeed: 60, shotDmg: 22,
                 shotSize: 6, shotLife: 5, shotRange: 165 },
    // Bosses. knock: share of the hit shove they take (default 1); chest: levels in the chest they drop.
    kingSlime: { hp: 600,  speed: 25, dmg: 30, xp: 40, size: 32, splitInto: 'slime', splitCount: 8, knock: 0.15, chest: 1 },
    orcChief:  { hp: 1200, speed: 35, dmg: 35, xp: 60, size: 32, chargeWindup: 0.8, chargeSpeed: 180, chargeEvery: 5, chargeDur: 1.2,
                 chargeRange: 170, knock: 0.1, chest: 2 },   // chargeEvery: windup to windup; chargeRange: winds up only this close (on screen)
    treant:    { hp: 40000, speed: 15, dmg: 40, xp: 0,  size: 64, rootWarn: 1.0, rootR: 20, rootDmg: 30, rootEvery: 3,
                 summonType: 'goblin', summonCount: 6, summonEvery: 12, knock: 0 },   // killing it wins the run: no drops
  },
  skills: {
    fireball: { dmg: { base: 10, perLv: 4 }, cd: 1.0, speed: 160, boomR: [12, 14, 16, 18, 20], count: [1, 1, 2, 2, 3],
      range: 220, spread: 12, size: 4 },   // range: targeting + flight px; spread: deg between balls; size: hit radius px
    meteor: {
      dmg: { base: 30, perLv: 9 }, cd: [3.2, 3.0, 2.8, 2.6, 2.4], r: [28, 32, 36, 40, 44], count: [1, 1, 2, 2, 3],
      warn: 0.8, burn: [1.5, 1.875, 2.25, 2.625, 3.0], burnDps: 6, burnTick: 0.5,   // burnTick: s between burning-ground hits
    },
    iceShard: {
      dmg: { base: 12, perLv: 5 }, cd: 0.7, pierce: [1, 2, 3, 4, 5], shards: [1, 2, 2, 3, 4], fan: 15,
      slow: [0.30, 0.35, 0.40, 0.45, 0.50], slowDur: 1.5, speed: 180, range: 220, size: 3,
    },
    frostNova: { dmg: { base: 12, perLv: 5 }, cd: { base: 3.5, perLv: -0.3 }, r: { base: 48, perLv: 8 }, freeze: { base: 1.2, perLv: 0.2 } },
    chainLightning: { dmg: { base: 14, perLv: 4 }, cd: 1.0, jumps: [3, 4, 5, 6, 7], strikes: [1, 1, 2, 2, 3], jumpRange: 80 },
    arcaneOrb: {
      dmg: { base: 9, perLv: 4 }, orbs: [2, 3, 4, 5, 6], orbitR: { base: 20, perLv: 3 },
      rotSpeed: { base: 4.0, perLv: 0.4 }, hitCd: 0.5, size: 7, push: 4,   // size: orb hit radius px; push: knockback px
    },
  },
  fusions: {
    hujanNeraka:  { cd: 7.5, dur: 4, rate: 10, dmg: 88, r: 36, warn: 0.3 },   // rate: meteors/s; warn: s of shadow before each lands
    absoluteZero: { cd: 6, freeze: 3, hitDmg: 36 },                       // hitDmg lands on the fresh ice: x frozenVulnMult (top level)
    // The storm: every cd, for dur s, rate bolts/s at random enemies within range (dmg, chaining jumps x jumpRange). The storm core (the
    // orbs, consumed) circles the mage at orbitR (x mods.area, rotSpeed rad/s) and every coreEvery s strikes the nearest enemy within coreRange (coreDmg).
    badaiPetir:   { cd: 13, dur: 6, rate: 7, range: 140, dmg: 38, jumps: 3, jumpRange: 60, orbitR: 30, rotSpeed: 1.6, coreEvery: 0.6, coreRange: 100, coreDmg: 14 },
    // cd: s from one collapse to the next opening (x mods.cooldown); r: pull reach px; pull: s it drags before collapsing; pullSpeed: px/s at the rim (more inside); tickDmg every tickEvery s while
    // pulling; collapseDmg hits everything within r, shoving it out by blastPush px. Damage numbers go through fusionDmg.
    lubangHitam:    { cd: 1.4, r: 120, pull: 2.5, pullSpeed: 110, swirl: 0.6, tickDmg: 7, tickEvery: 0.5, collapseDmg: 159, blastPush: 14 },
    // n suns orbit at orbitR (x mods.area), burn on contact within size px (dmg, each enemy every hitCd); each fires a fireball
    // (hit radius shotSize) every fireEvery s (x mods.cooldown) at the nearest enemy within shotRange on its outer side; shotDmg blasts boomR.
    cincinMatahari: { n: 6, orbitR: 48, rotSpeed: 3, size: 10, dmg: 42, hitCd: 0.4, push: 8,
                      fireEvery: 0.36, shotSpeed: 170, shotRange: 210, shotSize: 4, shotDmg: 72, boomR: 20 },
    // The bird loops round the mage (loopR px x mods.area, loopSpeed rad/s; the loop squashed to flat of its height, seen from above). Every trailEvery s each wing drops a trail spot
    // span px to its side (r trailR, lasting trailLife, ticking every trailTick): fire burns for burnDmg, ice slows by slow
    // for slowDur. Every diveEvery s (x mods.cooldown) it dives (diveTime s) through the densest crowd and blows up: diveDmg
    // within diveR (x mods.area), slowing too. Damage numbers go through fusionDmg.
    phoenix:      { loopR: 60, flat: 0.6, loopSpeed: 2.2, span: 10, trailEvery: 0.08, trailR: 9, trailLife: 1.2, trailTick: 0.35, burnDmg: 11,
                    slow: 0.5, slowDur: 1, diveEvery: 1, diveTime: 0.45, diveR: 56, diveDmg: 160 },
    // Every cd (from the end of the last run) the block drops land px beyond the densest crowd in view, warned for warn s:
    // landDmg within landR. Then it slides slide px across the view at speed px/s, running over everything within half px
    // of its lane and halfW px of its middle once (dmg, frozen for freeze s, shoved push px off the lane). landR and half x mods.area.
    gletser:      { cd: 0.3, warn: 0.5, land: 40, landR: 44, landDmg: 80, speed: 360, slide: 420, half: 34, halfW: 23, dmg: 160, freeze: 2, push: 8 },
    // Every cd a shard (shardDmg to what it pierces, hit radius shardSize) flies out at shardSpeed and lodges as a crystal: throwR px
    // (x mods.area), the last throwSpread of it varying per throw, the ring squashed to flat of its height (seen from above);
    // at most maxCrystals, each for life s. Crystals within link px are wired by lightning: every tick s each wire hits what
    // stands across it (within its radius + wire px) for tickDmg.
    pagarKristal: { cd: 0.25, maxCrystals: 20, life: 8, throwR: 165, throwSpread: 0.5, flat: 0.75, shardSize: 5, shardSpeed: 240, shardDmg: 25, link: 90, neighbours: 2, wire: 6, tick: 0.3, tickDmg: 26 },
    // Every cd a comet falls on the densest crowd in view (warn s): dmg and freeze s within r (x mods.area). shatter s later
    // its head bursts into `shards` shards (shardDmg, hit radius shardSize, pierce shardPierce, shardRange px at shardSpeed, slow for slowDur).
    kometEs:      { cd: 1.2, warn: 0.7, r: 52, dmg: 120, freeze: 2, shatter: 0.3, shards: 16, shardSize: 3, shardSpeed: 220, shardRange: 150,
                    shardDmg: 48, shardPierce: 2, slow: 0.4, slowDur: 1.5 },
    // Every cd (from the end of the last ring) a ring of fire rushes out of the mage to r px (x mods.area) over expand s, hitting
    // each enemy once as its front passes: dmg. Every burnGap px of its run it lays a ring of burning spots,
    // burnGap apart (r burnR, burnLife s, burnDmg every burnTick). The ring then stands fade s at full reach before the cd starts.
    supernova:    { cd: 2, r: 145, expand: 0.65, fade: 0.25, dmg: 60, burnGap: 22, burnR: 12, burnLife: 1.4, burnTick: 0.4, burnDmg: 8 },
    // Every cd (from the last pop) a plasma ball drifts at speed px/s to the densest crowd in view; every zapEvery s on the way it
    // zaps everything within zapR (zapDmg), and at the end it pops: popDmg within popR. zapR and popR x mods.area.
    bolaPlasma:   { cd: 0.65, speed: 70, zapR: 48, zapEvery: 0.3, zapDmg: 24, popR: 52, popDmg: 128 },
    // Every cd, pillars lightning pillars strike random enemies' spots in view, warned for warn s (each stagger s after the last):
    // dmg within r (x mods.area), then a bolt chains from the pillar on through jumps more enemies within jumpRange (chainDmg).
    penghakimanLangit: { cd: 3, pillars: 8, warn: 0.5, stagger: 0.12, r: 22, dmg: 45, chainDmg: 26, jumps: 4, jumpRange: 70 },
    // n ice blades orbit at orbitR (x mods.area), cutting what they touch within size px (dmg, each enemy every hitCd). Each sprays
    // a shard every sprayEvery s (x mods.cooldown) outward, turned twist rad along the spin: shardDmg, hit radius shardSize,
    // pierce shardPierce, shardRange px at shardSpeed, slowing by slow for slowDur.
    pusaranKristal: { n: 4, orbitR: 40, rotSpeed: 3.2, size: 12, dmg: 20, hitCd: 0.4, push: 4, sprayEvery: 0.2, twist: 0.5,
                      shardSpeed: 200, shardRange: 160, shardSize: 3, shardDmg: 24, shardPierce: 2, slow: 0.4, slowDur: 1.2 },
    // Every pulse s (x mods.cooldown) the aura zaps everything within r (x mods.area): dmg, frozen for freeze s. Then every frozen enemy
    // in view (frozen by anything) conducts: it arcs to its nearest unfrozen neighbour within arc px for arcDmg.
    medanStatis:  { pulse: 0.45, r: 110, dmg: 25, freeze: 0.5, arc: 60, arcDmg: 14 },
    // The ring stands ringR px out (x mods.area) and reaches thick px past it, the full disc inside too: what touches it takes dmg (each enemy every hitCd), is frozen for
    // freeze s and shoved push px. Every burstEvery s (x mods.cooldown, from the last burst's end) it blasts out to burstR (x mods.area)
    // over burstTime s, hitting each enemy once as its front passes: burstDmg, frozen burstFreeze s, shoved burstPush px; then it stands again.
    bentengEs:    { ringR: 28, thick: 6, dmg: 5, hitCd: 0.5, freeze: 1, push: 5, burstEvery: 6, burstTime: 0.35, burstR: 140, burstDmg: 40,
                    burstFreeze: 1.5, burstPush: 12 },
  },
  passives: {   // per-level amount
    vitality: { maxHp: 20 }, swiftness: { speed: 0.08 }, focus: { cooldown: 0.06 },
    magnet: { magnet: 0.25 }, wisdom: { xp: 0.10 }, amplify: { area: 0.08 },
  },
  audio: { master: 0.3, minGap: 0.04, maxVoices: 12, detuneCents: 50 },   // master: output gain; minGap: s between plays of one name; detune: +-cents per play
  touch: { stickR: 24, deadzone: 0.15, alpha: 0.45, pause: { right: 22, y: 20, size: 18, pad: 8 } },   // stickR: internal px of drag for full speed; deadzone: share of stickR; alpha: stick opacity; pause: button left edge `right` px in from the view's right edge, top y, + size, tap slack px around it
  healCard: 20,
  endDelay: { won: 2, lost: 1.5 },   // s from the treant's death / the mage's to the result
  drops: {
    heartChance: 0.015, heartHeal: 20, magnetChance: 0.003,
    maxGems: 300, pullSpeed: 200,   // pullSpeed: px/s a magnetised pickup flies at the player
    bossGemXp: 5,                   // a boss's xp falls as a ring of gems worth this much each
    chestHold: 0.6,                 // s: level-up cards wait for the chest to finish opening
    chestReach: 16,                 // px: a chest opens when the mage's body reaches it (never magnetised)
    gemTiers: [{ minXp: 5, sprite: 'gem_red' }, { minXp: 2, sprite: 'gem_green' }, { minXp: 0, sprite: 'gem_blue' }],   // first match wins
  },
  fx: {
    shakeMeteor: { px: 2, dur: 0.15 }, shakeUlt: { px: 4, dur: 0.4 }, hitstopBig: 0.05, hitstopUlt: 0.1, maxParticles: 600, maxNumbers: 150,
    shakeHurt: { px: 1.5, dur: 0.12 }, flashHurt: { color: '#ff2a2a', dur: 0.25 },
    hitstopGap: 0.8,                   // s: min gap between two small (<= hitstopBig) hitstops, all sources: no micro-stutter
    flashGap: 0.34,                    // s: min gap between any two screen flashes, all sources (<= 3/s: photosensitivity)
    burn: { alpha: 0.7, tuftArea: 300 },   // Meteor's burning ground: tuft opacity (lower = enemies and gems show through) and px² of ground per tuft (higher = sparser)
    blink: 0.08,                       // s: player sprite toggles this often during iframes
    knockback: 3,                      // px: default enemy shove per hit
    bigHit: 30,                        // damage at or above this prints yellow instead of white
    numberBudget: { burst: 6, rate: 15 },   // small-hit numbers: token bucket (max at once, refill /s) so crowds stay readable; big hits always print
    deathBurst: { count: 6, speed: 60 },
    bossBurst: { count: 24, speed: 110 },   // a boss's death burst (kingSlime / orcChief); the treant's is bigger still
    shakeBoss: { px: 3, dur: 0.35 },
    deathColor: {                      // particle colour per enemy type (palette)
      slime: '#5ee0a0', bat: '#9b5de5', slimeRed: '#e2585e', goblin: '#7fcf5c', wolf: '#a3a3c2', orc: '#8a9a58', witch: '#ff5ad9',
      kingSlime: '#5ee0a0', orcChief: '#8a9a58', treant: '#46a24a',
      default: '#fff1a8',
    },
  },
};
export default TUNING;
