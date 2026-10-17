// Spawner: turns SCHEDULE into spawn requests [{type, x, y}]. Pure logic, no world/game imports.
import TUNING from '../data/tuning.js';
import { SCHEDULE } from '../data/spawns.js';

const BAND = 48;   // spawn ring thickness beyond the margin: "just outside the camera"

const clampTo = (v, max) => Math.min(Math.max(v, 0), max);

// A point outside `view` (expanded by margin) but inside bounds {w, h}. Rejection-samples the band
// around the view; the sides cut off by the world edge simply never accept.
export function offscreenPoint(view, bounds, rng, margin = 16) {
  const x0 = Math.max(0, view.x - margin - BAND), x1 = Math.min(bounds.w, view.x + view.w + margin + BAND);
  const y0 = Math.max(0, view.y - margin - BAND), y1 = Math.min(bounds.h, view.y + view.h + margin + BAND);
  for (let i = 0; i < 64; i++) {
    const x = rng.range(x0, x1), y = rng.range(y0, y1);
    if (x < view.x - margin || x > view.x + view.w + margin || y < view.y - margin || y > view.y + view.h + margin) return { x, y };
  }
  // ponytail: band fully cut off (only if the view nearly fills the world): farthest world corner
  return { x: view.x + view.w / 2 < bounds.w / 2 ? bounds.w : 0, y: view.y + view.h / 2 < bounds.h / 2 ? bounds.h : 0 };
}

export const createSpawner = () => ({ acc: 0, ei: 0, bi: 0, out: [] });

function pickType(mix, rng) {
  let total = 0;
  for (const k in mix) total += mix[k];
  let r = rng.next() * total;
  for (const k in mix) if ((r -= mix[k]) < 0) return k;
  return Object.keys(mix)[0];
}

// `count` of `type` jittered around one offscreen point (goblin bands, wolf packs).
function cluster(out, type, count, view, bounds, rng, margin) {
  const s = SCHEDULE.groupSpread, c = offscreenPoint(view, bounds, rng, margin + s);
  for (let i = 0; i < count; i++)
    out.push({ type, x: clampTo(c.x + rng.range(-s, s), bounds.w), y: clampTo(c.y + rng.range(-s, s), bounds.h) });
}

// t: run time after this step (s). Returns sp.out, reused: read it before the next call.
export function spawnerUpdate(sp, t, dt, view, bounds, rng, aliveCount, margin = 16) {
  const out = sp.out;
  out.length = 0;
  const { events, bosses, waves, groups } = SCHEDULE;
  for (; sp.ei < events.length && events[sp.ei].at <= t; sp.ei++) {
    const ev = events[sp.ei];
    if (ev.kind === 'wolfPack') cluster(out, 'wolf', ev.count, view, bounds, rng, margin);
    else {
      const cx = view.x + view.w / 2, cy = view.y + view.h / 2, a0 = rng.next() * Math.PI * 2;
      for (let i = 0; i < ev.count; i++) {
        const a = a0 + i / ev.count * Math.PI * 2;
        out.push({ type: 'bat', x: clampTo(cx + Math.cos(a) * SCHEDULE.ringRadius, bounds.w), y: clampTo(cy + Math.sin(a) * SCHEDULE.ringRadius, bounds.h) });
      }
    }
  }
  for (; sp.bi < bosses.length && bosses[sp.bi].at <= t; sp.bi++) {
    const p = offscreenPoint(view, bounds, rng, margin);
    out.push({ type: bosses[sp.bi].type, x: p.x, y: p.y });
  }
  let room = TUNING.maxEnemies - aliveCount;
  if (room <= 0) return out;                               // capped: no backlog builds up either
  const min = t / 60;
  let wave = waves[0];
  for (const w of waves) if (min >= w.from) wave = w;      // waves are sorted by `from`
  for (sp.acc += wave.rate * dt; sp.acc >= 1 && room > 0; sp.acc--) {
    const type = pickType(wave.mix, rng), n = Math.min(groups[type] ?? 1, room);
    if (n > 1) cluster(out, type, n, view, bounds, rng, margin);
    else { const p = offscreenPoint(view, bounds, rng, margin); out.push({ type, x: p.x, y: p.y }); }
    room -= n;
  }
  return out;
}
