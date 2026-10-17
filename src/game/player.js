import TUNING from '../data/tuning.js';
import { terrainSpeed, clampToWorld } from './world.js';

export function updatePlayer(p, dt, input) {
  const v = input.moveVector(), k = p.speed * terrainSpeed(p.x, p.y) * dt;
  Object.assign(p, clampToWorld({ x: p.x + v.x * k, y: p.y + v.y * k }));
  p.moving = v.x !== 0 || v.y !== 0;
  if (v.x) p.facing = v.x < 0 ? -1 : 1;
}

// True on the "off" half of the blink while the player is invulnerable.
export const blinkHidden = (p, now) => now < p.iframesUntil && Math.floor(now / TUNING.fx.blink) % 2 === 1;
