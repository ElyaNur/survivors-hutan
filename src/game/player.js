import { terrainSpeed, clampToWorld } from './world.js';

export function updatePlayer(p, dt, input) {
  const v = input.moveVector(), k = p.speed * terrainSpeed(p.x, p.y) * dt;
  Object.assign(p, clampToWorld({ x: p.x + v.x * k, y: p.y + v.y * k }));
  p.moving = v.x !== 0 || v.y !== 0;
  if (v.x) p.facing = v.x < 0 ? -1 : 1;
}
