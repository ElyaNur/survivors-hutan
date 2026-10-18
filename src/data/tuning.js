// Starting guesses (tuned later). Per-level skill values: number | {base, perLv} | 5-array (lv1..lv5).
const TUNING = {
  player: { hp: 100, speed: 60, iframes: 0.6, magnet: 32, pickup: 8, size: 12 },   // size: hitbox diameter (sprite is 17 wide)
  frozenVulnMult: 2,
  xp: { base: 5, step1: 10, step2: 110, step3: 160 },
  enemyHpGrowthPerMin: 0.095,
  maxEnemies: 400,
  enemyCullDist: 700,   // farther than this from the player -> moved back to just off-screen
  enemies: {
    slime:    { hp: 6,    speed: 30, dmg: 6,  xp: 1,  size: 12 },
    bat:      { hp: 4,    speed: 56, dmg: 3,  xp: 1,  size: 10, wobble: 0.9, wobbleRate: 7 },
    slimeRed: { hp: 18,   speed: 38, dmg: 10,  xp: 1.5,  size: 12 },
    goblin:   { hp: 18,   speed: 45, dmg: 8,  xp: 1.5,  size: 14 },
    wolf:     { hp: 25,   speed: 85, dmg: 15, xp: 2,  size: 16, reaim: 2 },
    orc:      { hp: 80,   speed: 28, dmg: 22, xp: 3,  size: 18 },
    witch:    { hp: 30,   speed: 35, dmg: 12,  xp: 2.5,  size: 14, keepDist: 110, shotEvery: 3, shotSpeed: 60, shotDmg: 15,
                 shotSize: 6, shotLife: 5, shotRange: 180 },
    // Bosses. knock: share of the hit shove they take (default 1); chest: levels in the chest they drop.
    kingSlime: { hp: 600,  speed: 25, dmg: 30, xp: 40, size: 32, splitInto: 'slime', splitCount: 8, knock: 0.15, chest: 1 },
    orcChief:  { hp: 1200, speed: 35, dmg: 35, xp: 60, size: 32, chargeWindup: 0.8, chargeSpeed: 180, chargeEvery: 5, chargeDur: 1.2,
                 chargeRange: 170, knock: 0.1, chest: 2 },   // chargeEvery: windup to windup; chargeRange: winds up only this close (on screen)
    treant:    { hp: 10000, speed: 15, dmg: 40, xp: 0,  size: 64, rootWarn: 1.0, rootR: 20, rootDmg: 30, rootEvery: 3,
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
      dmg: { base: 7, perLv: 3 }, orbs: [2, 3, 4, 5, 6], orbitR: { base: 20, perLv: 3 },
      rotSpeed: { base: 4.0, perLv: 0.4 }, hitCd: 0.5, size: 7, push: 4,   // size: orb hit radius px; push: knockback px
    },
  },
  fusions: {
    hujanNeraka:  { cd: 25, dur: 4, rate: 6, dmg: 55, r: 36, warn: 0.3 },   // rate: meteors/s; warn: s of shadow before each lands
    absoluteZero: { cd: 22, freeze: 4, hitDmg: 40 },                       // hitDmg lands on the fresh ice: x frozenVulnMult (top level)
    badaiPetir:   { cd: 22, dur: 6, rate: 7, range: 140, dmg: 50, orbBoost: 1.0, jumps: 3, jumpRange: 60 },   // orbBoost unused now: the orbs are consumed
    // cd: s from one collapse to the next opening (x mods.cooldown); r: pull reach px; pull: s it drags before collapsing; pullSpeed: px/s at the rim (more inside); tickDmg every tickEvery s while
    // pulling; collapseDmg hits everything within r, shoving it out by blastPush px. Damage numbers go through fusionDmg.
    lubangHitam:    { cd: 6.5, r: 80, pull: 2.5, pullSpeed: 110, swirl: 0.6, tickDmg: 5, tickEvery: 0.5, collapseDmg: 110, blastPush: 14 },
    // n suns orbit at orbitR (x mods.area), burn on contact within size px (dmg, each enemy every hitCd); each fires a fireball
    // (hit radius shotSize) every fireEvery s (x mods.cooldown) at the nearest enemy within shotRange on its outer side; shotDmg blasts boomR.
    cincinMatahari: { n: 3, orbitR: 42, rotSpeed: 2.0, size: 10, dmg: 14, hitCd: 0.4, push: 5,
                      fireEvery: 1.2, shotSpeed: 170, shotRange: 210, shotSize: 4, shotDmg: 26, boomR: 16 },
    // placeholders until Task 8-10: every cd hits the nearest few enemies within r
    phoenix:           { cd: 6, dmg: 60, r: 100 }, supernova:      { cd: 6, dmg: 60, r: 100 }, bolaPlasma:    { cd: 6, dmg: 60, r: 100 },
    kometEs:           { cd: 6, dmg: 60, r: 100 }, gletser:        { cd: 6, dmg: 60, r: 100 },
    penghakimanLangit: { cd: 6, dmg: 60, r: 100 }, pagarKristal:   { cd: 6, dmg: 60, r: 100 },
    pusaranKristal:    { cd: 6, dmg: 60, r: 100 }, medanStatis:    { cd: 6, dmg: 60, r: 100 }, bentengEs:     { cd: 6, dmg: 60, r: 100 },
  },
  passives: {   // per-level amount
    vitality: { maxHp: 20 }, swiftness: { speed: 0.08 }, focus: { cooldown: 0.06 },
    magnet: { magnet: 0.25 }, wisdom: { xp: 0.10 }, amplify: { area: 0.08 },
  },
  audio: { master: 0.3, minGap: 0.04, maxVoices: 12, detuneCents: 50 },   // master: output gain; minGap: s between plays of one name; detune: +-cents per play
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
