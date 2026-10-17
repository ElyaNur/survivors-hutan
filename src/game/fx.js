// Game-feel effects: particles, damage numbers, screen shake, hitstop, flash, one-shot anims.
// Fixed pools (ring-overwrite = drop oldest), so no per-frame allocation.
import TUNING from '../data/tuning.js';
import { drawText } from '../engine/font.js';

const NUM_LIFE = 0.6, NUM_RISE = 12, MAX_ANIMS = 32, FLASH_ALPHA = 0.4, FLASH_PAD = 8, ANIM_FALLBACK = 0.4;

const pool = (n, mk) => Array.from({ length: n }, mk);

// assets (optional) supplies anim lengths: assets.animTotal(name) -> ms.
export function createFx(assets) {
  const parts = pool(TUNING.fx.maxParticles, () => ({ life: 0, max: 0, x: 0, y: 0, vx: 0, vy: 0, color: '#fff' }));
  const nums = pool(TUNING.fx.maxNumbers, () => ({ life: 0, x: 0, y: 0, text: '', color: 'w' }));
  const anims = pool(MAX_ANIMS, () => ({ life: 0, age: 0, x: 0, y: 0, name: '', scale: 1 }));
  let pi = 0, ni = 0, ai = 0;
  let shakePx = 0, shakeDur = 0, shakeLeft = 0, hitLeft = 0;
  let flashColor = '#fff', flashDur = 0, flashLeft = 0;
  const off = { x: 0, y: 0 }, topt = { color: 'w', align: 'center', alpha: 1 };   // topt reused: no per-number allocation
  const amp = () => (shakeLeft > 0 ? shakePx * shakeLeft / shakeDur : 0);
  const count = a => { let c = 0; for (let i = 0; i < a.length; i++) if (a[i].life > 0) c++; return c; };

  return {
    shake(px, dur) { if (px >= amp()) { shakePx = px; shakeDur = dur; shakeLeft = dur; } },
    hitstop(sec) { if (sec > hitLeft) hitLeft = sec; },
    number(x, y, value, color = 'w') {
      const n = nums[ni]; ni = (ni + 1) % nums.length;
      n.life = NUM_LIFE; n.x = x; n.y = y; n.text = String(value); n.color = color;
    },
    burst(x, y, color, count, speed) {
      for (let i = 0; i < count; i++) {
        const p = parts[pi]; pi = (pi + 1) % parts.length;
        const a = Math.random() * 6.2832, s = speed * (0.4 + Math.random() * 0.6);
        p.life = p.max = 0.3 + Math.random() * 0.3; p.x = x; p.y = y;
        p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s; p.color = color;
      }
    },
    flashScreen(color, dur) { flashColor = color; flashDur = flashLeft = dur; },
    // dur (seconds) defaults to the anim's own length.
    anim(x, y, name, { scale = 1, dur = (assets?.animTotal(name) || ANIM_FALLBACK * 1000) / 1000 } = {}) {
      const a = anims[ai]; ai = (ai + 1) % anims.length;
      a.life = dur; a.age = 0; a.x = x; a.y = y; a.name = name; a.scale = scale;
    },
    update(dt) {
      for (const p of parts) {
        if (p.life <= 0) continue;
        p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
        const d = Math.max(0, 1 - 4 * dt); p.vx *= d; p.vy *= d;
      }
      for (const n of nums) if (n.life > 0) n.life -= dt;
      for (const a of anims) if (a.life > 0) { a.life -= dt; a.age += dt; }
      if (flashLeft > 0) flashLeft -= dt;
      if (hitLeft > 0) hitLeft -= dt;
      if (shakeLeft > 0) shakeLeft -= dt;
      const m = amp();
      off.x = m > 0 ? Math.round((Math.random() * 2 - 1) * m) : 0;
      off.y = m > 0 ? Math.round((Math.random() * 2 - 1) * m) : 0;
    },
    offset: () => off, // shared object, read it, don't keep it
    frozen: () => hitLeft > 0,
    counts: () => ({ particles: count(parts), numbers: count(nums), anims: count(anims) }),
    // between(): drawn after particles and anims, before numbers and the screen flash (the mage goes there).
    draw(ctx, cam, assets, between) {
      for (const p of parts) {
        if (p.life <= 0) continue;
        ctx.globalAlpha = Math.min(1, p.life / p.max * 2);
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x - cam.x) - 1, Math.round(p.y - cam.y) - 1, 2, 2);
      }
      ctx.globalAlpha = 1;
      for (const a of anims) {
        if (a.life <= 0) continue;
        const sx = a.x - cam.x, sy = a.y - cam.y;
        if (a.scale === 1) assets.draw(ctx, a.name, sx, sy, { t: a.age * 1000 });
        else { ctx.save(); ctx.translate(sx, sy); ctx.scale(a.scale, a.scale); assets.draw(ctx, a.name, 0, 0, { t: a.age * 1000 }); ctx.restore(); }
      }
      between?.();
      for (const n of nums) {
        if (n.life <= 0) continue;
        const k = 1 - n.life / NUM_LIFE;
        topt.color = n.color; topt.alpha = Math.min(1, n.life / (NUM_LIFE * 0.5));
        drawText(ctx, assets, n.text, n.x - cam.x, n.y - cam.y - NUM_RISE * k, topt);
      }
      if (flashLeft > 0) {
        ctx.globalAlpha = FLASH_ALPHA * flashLeft / flashDur; ctx.fillStyle = flashColor;
        ctx.fillRect(-FLASH_PAD, -FLASH_PAD, cam.w + 2 * FLASH_PAD, cam.h + 2 * FLASH_PAD);
        ctx.globalAlpha = 1;
      }
    },
  };
}
