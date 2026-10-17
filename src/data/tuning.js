// Starting guesses (tuned later). Per-level skill values: number | {base, perLv} | 5-array (lv1..lv5).
const TUNING = {
  player: { hp: 100, speed: 60, iframes: 0.5, magnet: 24, pickup: 8, size: 12 },   // size: hitbox diameter (sprite is 17 wide)
  frozenVulnMult: 2,
  xp: { base: 5, step1: 10, step2: 13, step3: 16 },
  enemyHpGrowthPerMin: 0.08,
  maxEnemies: 400,
  enemyCullDist: 700,   // farther than this from the player -> moved back to just off-screen
  enemies: {
    slime:    { hp: 6,    speed: 30, dmg: 5,  xp: 1,  size: 12 },
    bat:      { hp: 4,    speed: 70, dmg: 4,  xp: 1,  size: 10, wobble: 0.9, wobbleRate: 7 },
    slimeRed: { hp: 18,   speed: 38, dmg: 8,  xp: 2,  size: 12 },
    goblin:   { hp: 20,   speed: 45, dmg: 8,  xp: 2,  size: 14 },
    wolf:     { hp: 25,   speed: 85, dmg: 10, xp: 3,  size: 16, reaim: 2 },
    orc:      { hp: 80,   speed: 28, dmg: 15, xp: 5,  size: 18 },
    witch:    { hp: 30,   speed: 35, dmg: 8,  xp: 4,  size: 14, keepDist: 110, shotEvery: 3, shotSpeed: 60, shotDmg: 10,
                 shotSize: 6, shotLife: 5, shotRange: 180 },
    // Bosses. knock: share of the hit shove they take (default 1); chest: levels in the chest they drop.
    kingSlime: { hp: 600,  speed: 25, dmg: 20, xp: 40, size: 32, splitInto: 'slime', splitCount: 8, knock: 0.15, chest: 1 },
    orcChief:  { hp: 1200, speed: 35, dmg: 25, xp: 60, size: 32, chargeWindup: 0.8, chargeSpeed: 180, chargeEvery: 5, chargeDur: 1.2,
                 chargeRange: 170, knock: 0.1, chest: 2 },   // chargeEvery: windup to windup; chargeRange: winds up only this close (on screen)
    treant:    { hp: 8000, speed: 15, dmg: 30, xp: 0,  size: 64, rootWarn: 1.0, rootR: 20, rootDmg: 20, rootEvery: 3,
                 summonType: 'goblin', summonCount: 6, summonEvery: 12, knock: 0 },   // killing it wins the run: no drops
  },
  skills: {
    fireball: { dmg: { base: 10, perLv: 4 }, cd: 1.2, speed: 160, boomR: [12, 14, 16, 18, 20], count: [1, 1, 2, 2, 3],
      range: 220, spread: 12, size: 4 },   // range: targeting + flight px; spread: deg between balls; size: hit radius px
    meteor: {
      dmg: { base: 30, perLv: 10 }, cd: [4.0, 3.75, 3.5, 3.25, 3.0], r: [28, 32, 36, 40, 44], count: [1, 1, 2, 2, 3],
      warn: 0.8, burn: [1.5, 1.875, 2.25, 2.625, 3.0], burnDps: 6, burnTick: 0.5,   // burnTick: s between burning-ground hits
    },
    iceShard: {
      dmg: { base: 8, perLv: 3 }, cd: 1.0, pierce: [1, 2, 3, 4, 5], shards: [1, 2, 2, 3, 3], fan: 15,
      slow: [0.30, 0.35, 0.40, 0.45, 0.50], slowDur: 1.5, speed: 180, range: 220, size: 3,
    },
    frostNova: { dmg: { base: 6, perLv: 2 }, cd: { base: 4.0, perLv: -0.3 }, r: { base: 36, perLv: 6 }, freeze: { base: 1.0, perLv: 0.2 } },
    chainLightning: { dmg: { base: 12, perLv: 4 }, cd: 1.5, jumps: [2, 3, 4, 5, 6], strikes: [1, 1, 2, 2, 3], jumpRange: 60 },
    arcaneOrb: {
      dmg: { base: 6, perLv: 2 }, orbs: [2, 3, 4, 5, 6], orbitR: { base: 28, perLv: 3 },
      rotSpeed: { base: 3.0, perLv: 0.4 }, hitCd: 0.5, size: 5, push: 4,   // size: orb hit radius px; push: knockback px
    },
  },
  ults: {
    armageddon:   { cd: 25, dur: 4, rate: 6, dmg: 60, r: 36, warn: 0.3 },   // rate: meteors/s; warn: s of shadow before each lands
    absoluteZero: { cd: 30, freeze: 3, hitDmg: 20 },                       // hitDmg lands on the fresh ice: x frozenVulnMult (top level)
    badaiPetir:   { cd: 25, dur: 6, rate: 5, range: 140, dmg: 40, orbBoost: 0.5, jumps: 2, jumpRange: 60 },   // orbs deal x(1 + orbBoost)
  },
  passives: {   // per-level amount
    vitality: { maxHp: 20 }, swiftness: { speed: 0.08 }, focus: { cooldown: 0.06 },
    magnet: { magnet: 0.25 }, wisdom: { xp: 0.10 }, amplify: { area: 0.08 },
  },
  healCard: 30,
  endDelay: { won: 2, lost: 1.5 },   // s from the treant's death / the mage's to the result
  drops: {
    heartChance: 0.01, heartHeal: 25, magnetChance: 0.003,
    maxGems: 300, pullSpeed: 200,   // pullSpeed: px/s a magnetised pickup flies at the player
    bossGemXp: 5,                   // a boss's xp falls as a ring of gems worth this much each
    chestHold: 0.6,                 // s: level-up cards wait for the chest to finish opening
    chestReach: 16,                 // px: a chest opens when the mage's body reaches it (never magnetised)
    gemTiers: [{ minXp: 5, sprite: 'gem_red' }, { minXp: 2, sprite: 'gem_green' }, { minXp: 0, sprite: 'gem_blue' }],   // first match wins
  },
  fx: {
    shakeMeteor: { px: 2, dur: 0.15 }, shakeUlt: { px: 4, dur: 0.4 }, hitstopBig: 0.05, hitstopUlt: 0.1, maxParticles: 600, maxNumbers: 150,
    shakeHurt: { px: 1.5, dur: 0.12 }, flashHurt: { color: '#ff2a2a', dur: 0.25 },
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
