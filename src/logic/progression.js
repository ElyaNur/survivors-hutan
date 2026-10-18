import TUNING from '../data/tuning.js';
import { PASSIVES } from '../data/classes.js';

export const MAX_LV = 5, MAX_SLOTS = 4;

export function xpToNext(level) {
  const { base, step1, step2, step3 } = TUNING.xp;   // base + step1*(l-1) (10/level) | then step2 (40/level) from l20 | step3 (160/level) from l40
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

export const fusionFor = (classDef, x, y) => classDef.fusions.find(f => (f.a === x && f.b === y) || (f.a === y && f.b === x));

export function eligibleFusions(build, classDef) {
  return classDef.fusions.filter(f => build.skills[f.a] >= MAX_LV && build.skills[f.b] >= MAX_LV)
    .map(f => ({ kind: 'fusion', id: f.id, a: f.a, b: f.b }));
}

export function consumedSkills(build, classDef) {
  const s = new Set();
  for (const id of build.fusions) { const f = classDef.fusions.find(f => f.id === id); s.add(f.a); s.add(f.b); }
  return s;
}

function eligible(kind, owned, pool, used, skip = new Set()) {
  const cards = [], full = used >= MAX_SLOTS;
  for (const id of pool) {
    const lv = owned[id] || 0;
    if (!skip.has(id) && (lv ? lv < MAX_LV : !full)) cards.push({ kind, id, nextLevel: lv + 1 });
  }
  return cards;
}

export function rollCards(build, classDef, rng, n = 3) {
  const fusions = eligibleFusions(build, classDef);
  const out = fusions.length ? fusions.splice(rng.int(0, fusions.length - 1), 1) : [];   // one fusion card is guaranteed
  const pool = [...eligible('skill', build.skills, classDef.skills, Object.keys(build.skills).length + build.fusions.length, consumedSkills(build, classDef)), ...eligible('passive', build.passives, PASSIVES, Object.keys(build.passives).length), ...fusions];
  // A held skill's next level is drawn heldSkillWeight x as often as any other card: planned pairs reach Lv5 in time to fuse.
  const w = c => c.kind === 'skill' && c.nextLevel > 1 ? TUNING.cards.heldSkillWeight : 1;
  while (out.length < n && pool.length) {
    let r = rng.next() * pool.reduce((s, c) => s + w(c), 0), i = 0;
    while ((r -= w(pool[i])) >= 0 && i < pool.length - 1) i++;
    out.push(pool.splice(i, 1)[0]);
  }
  for (let i = out.length - 1; i > 0; i--) { const j = rng.int(0, i); [out[i], out[j]] = [out[j], out[i]]; }
  return out.length ? out : [{ kind: 'heal' }];
}

// Heal is applied to the player by the caller (run.js), not here.
export function applyCard(build, card) {
  if (card.kind === 'skill') build.skills[card.id] = card.nextLevel;
  else if (card.kind === 'passive') build.passives[card.id] = card.nextLevel;
  else if (card.kind === 'fusion') { delete build.skills[card.a]; delete build.skills[card.b]; build.fusions.push(card.id); }
}

export function passiveMods(build) {
  const amt = (id, key) => (TUNING.passives[id][key]) * (build.passives[id] || 0);
  return {
    maxHp: amt('vitality', 'maxHp'), speed: 1 + amt('swiftness', 'speed'), cooldown: 1 - amt('focus', 'cooldown'),
    magnet: 1 + amt('magnet', 'magnet'), xp: 1 + amt('wisdom', 'xp'), area: 1 + amt('amplify', 'area'),
  };
}
