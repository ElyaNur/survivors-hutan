// Sheet parsing (pure, testable in node) + browser loading/drawing.
export function parseSheet(json) {
  const frames = {}, names = Object.keys(json.frames), durOf = {};
  for (const n of names) {
    const { x, y, w, h } = json.frames[n].frame;
    frames[n] = { x, y, w, h };
    durOf[n] = json.frames[n].duration ?? 100;
  }
  const anims = {};
  for (const t of json.meta.frameTags ?? []) {
    const fs = names.slice(t.from, t.to + 1), durations = fs.map(n => durOf[n]);
    anims[t.name] = { frames: fs, durations, total: durations.reduce((s, d) => s + d, 0) };
  }
  return { frames, anims };
}

export function animFrame(anim, tMs, loop = true) {
  const t = loop ? tMs % anim.total : Math.min(tMs, anim.total - 1);
  let acc = 0;
  for (let i = 0; i < anim.frames.length; i++) {
    acc += anim.durations[i];
    if (t < acc) return anim.frames[i];
  }
  return anim.frames[anim.frames.length - 1];
}

const loadImage = src => new Promise((res, rej) => {
  const img = new Image();
  img.onload = () => res(img); img.onerror = () => rej(new Error('image failed: ' + src));
  img.src = src;
});

// White silhouette of the sheet, built once, used for the hit flash.
function whiteVersion(img) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  return c;
}

export async function loadSheets(names, base = 'art/out/') {
  const sheets = await Promise.all(names.map(async n => {
    const [json, img] = await Promise.all([
      fetch(`${base}${n}.json`).then(r => { if (!r.ok) throw new Error(`${n}.json: ${r.status}`); return r.json(); }),
      loadImage(`${base}${n}.png`),
    ]);
    return { ...parseSheet(json), img, white: whiteVersion(img) };
  }));
  const frameOwner = {}, animOwner = {};
  for (const s of sheets) {
    for (const f of Object.keys(s.frames)) frameOwner[f] = s;
    for (const a of Object.keys(s.anims)) animOwner[a] = s;
  }
  const firstFrame = name => animOwner[name] ? animOwner[name].frames[animOwner[name].anims[name].frames[0]] : frameOwner[name].frames[name];
  return {
    has: name => name in animOwner || name in frameOwner,
    animTotal: name => animOwner[name]?.anims[name].total ?? 0,   // ms, 0 for a plain frame
    size: name => { const f = firstFrame(name); return { w: f.w, h: f.h }; },
    // Draws a frame or anim centred at x,y. t is ms into the anim.
    draw(ctx, name, x, y, { flip = false, t = 0, alpha = 1, flash = false } = {}) {
      const s = animOwner[name];
      const fname = s ? animFrame(s.anims[name], t) : name;
      const sh = s ?? frameOwner[name];
      if (!sh) throw new Error('unknown sprite: ' + name);
      const f = sh.frames[fname];
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(Math.round(x), Math.round(y));
      if (flip) ctx.scale(-1, 1); // keeps the centre pixel column fixed for odd widths
      ctx.drawImage(flash ? sh.white : sh.img, f.x, f.y, f.w, f.h, -(flip ? f.w - (f.w >> 1) : f.w >> 1), -(f.h >> 1), f.w, f.h);
      ctx.restore();
    },
    // 9-slice: corners b px fixed, edges and centre stretched to fill the w x h box at x,y (top-left).
    drawSlice(ctx, name, x, y, w, h, b) {
      const sh = frameOwner[name], f = sh.frames[name];
      x = Math.round(x); y = Math.round(y);
      const sx = [0, b, f.w - b], sw = [b, f.w - 2 * b, b], dx = [x, x + b, x + w - b], dw = [b, w - 2 * b, b];
      const sy = [0, b, f.h - b], shh = [b, f.h - 2 * b, b], dy = [y, y + b, y + h - b], dh = [b, h - 2 * b, b];
      for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++)
        ctx.drawImage(sh.img, f.x + sx[i], f.y + sy[j], sw[i], shh[j], dx[i], dy[j], dw[i], dh[j]);
    },
  };
}
