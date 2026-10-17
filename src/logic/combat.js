import TUNING from '../data/tuning.js';

export function hitEnemy(e, dmg, now) {
  const dealt = Math.round(dmg * (now < e.vulnerableUntil ? TUNING.frozenVulnMult : 1));
  e.hp -= dealt;
  e.flashUntil = now + 0.08;
  const killed = e.hp <= 0 && !e.dead;
  if (killed) e.dead = true;
  return { dealt, killed };
}

export function hurtPlayer(p, dmg, now) {
  if (now < p.iframesUntil) return false;
  p.hp -= dmg;
  p.iframesUntil = now + TUNING.player.iframes;
  return true;
}

export const speedFactor = (e, now) =>
  now < e.frozenUntil ? 0 : now < e.slowUntil ? 1 - e.slowAmt : 1;

export function knockback(e, fromX, fromY, power) {
  const dx = e.x - fromX, dy = e.y - fromY, d = Math.hypot(dx, dy) || 1;
  e.x += dx / d * power; e.y += dy / d * power;
}
