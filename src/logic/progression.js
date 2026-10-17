import TUNING from '../data/tuning.js';
import { PASSIVES } from '../data/classes.js';

const MAX_LV = 5, MAX_SLOTS = 4;

export function xpToNext(level) {
  const { base, step1, step2, step3 } = TUNING.xp;   // 5 + 10*(l-1) | 185 + 13*(l-19) | 445 + 16*(l-39)
  if (level < 20) return base + step1 * (level - 1);
  if (level < 40) return base + step1 * 18 + step2 * (level - 19);
  return base + step1 * 18 + step2 * 20 + step3 * (level - 39);
}

// Mutates prog {level, xp}; returns levels gained.
export function gainXp(prog, amount) {
  prog.xp += amount;
  let gained = 0;
  while (prog.xp >= xpToNext(prog.level)) { prog.xp -= xpToNext(prog.level); prog.level++; gained++; }
  return gained;
}

function eligible(kind, owned, pool) {
  const cards = [];
  const full = Object.keys(owned).length >= MAX_SLOTS;
  for (const id of pool) {
    const lv = owned[id] || 0;
    if (lv ? lv < MAX_LV : !full) cards.push({ kind, id, nextLevel: lv + 1 });
  }
  return cards;
}

export function rollCards(build, classDef, rng, n = 3) {
  const pool = [...eligible('skill', build.skills, classDef.skills), ...eligible('passive', build.passives, PASSIVES)];
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
  return out.length ? out : [{ kind: 'heal' }];
}

// Heal is applied to the player by the caller (run.js), not here.
export function applyCard(build, card) {
  if (card.kind === 'skill') build.skills[card.id] = card.nextLevel;
  else if (card.kind === 'passive') build.passives[card.id] = card.nextLevel;
}

export function newlyUnlocked(build, classDef) {
  return classDef.recipes
    .filter(r => build.skills[r.a] >= MAX_LV && build.skills[r.b] >= MAX_LV && !build.ults.includes(r.ult))
    .map(r => r.ult);
}

export function recipeTags(classDef, skillId) {
  return classDef.recipes.filter(r => r.a === skillId || r.b === skillId).map(r => r.ult);
}

export function passiveMods(build) {
  const amt = (id, key) => (TUNING.passives[id][key]) * (build.passives[id] || 0);
  return {
    maxHp: amt('vitality', 'maxHp'), speed: 1 + amt('swiftness', 'speed'), cooldown: 1 - amt('focus', 'cooldown'),
    magnet: 1 + amt('magnet', 'magnet'), xp: 1 + amt('wisdom', 'xp'), area: 1 + amt('amplify', 'area'),
  };
}
