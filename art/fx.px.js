include("palette.px.js")

// Fireball, flying right: white-hot leading edge, flickering tail.
// No dark outline: the bright colours and glow are its read against grass and monsters.
const FIREBALL = [`
........
....ooo.
..OooYYo
ROooYyww
.ROoYyyY
...OooYo
.....oo.`, `
........
...Oooo.
.ROooYYo
..OoYyww
ROOoYyyY
..R.ooYo
.....oo.`, `
........
.R..ooo.
..OooYYo
.OooYyww
..ROYyyY
.R.OooYo
.....oo.`]

anim("fireball_fly", { w: 8, h: 8, fps: 10 },
  ...FIREBALL.map((g) => frame(grid(0, 0, g))),
  glow("w", { r: 2, strength: 0.5, bands: 2 }))

// Explosion, 24x24: a cluster of puffs that pops white, swells, cools to red and drifts off as smoke.
// Each puff: rim circle, fill offset up-left, highlight further up-left (light from the top-left).
const PUFFS = [[0, 0, 5], [-5, -2, 3], [5, -3, 3], [-3, 4, 3], [4, 4, 3], [0, -6, 3], [-7, 3, 2], [7, 1, 2]]
const BLAST = [ // scale, spread, rise, [rim, fill, highlight]
  [0.45, 0.4, 0, ["Y", "w", "w"]],
  [0.75, 0.7, 0, ["o", "y", "w"]],
  [1.0, 0.95, 0, ["O", "Y", "y"]],
  [1.05, 1.1, 1, ["O", "o", "Y"]],
  [0.8, 1.25, 2, ["R", "O", "o"]],
  [0.7, 1.4, 4, ["X", "x", null]],
]
anim("fx_explosion", { w: 24, h: 24, fps: 10, loop: false, frames: BLAST.length }, (c) => {
  const [scale, spread, rise, [rim, fill, hi]] = BLAST[c.frame]
  const at = (dx, dy) => [Math.round(12 + dx * spread), Math.round(12 + dy * spread - rise)]
  for (const [dx, dy, r] of PUFFS) { const [x, y] = at(dx, dy); c.circ(x, y, Math.round(r * scale), rim) }
  for (const [dx, dy, r] of PUFFS) { const [x, y] = at(dx, dy); c.circ(x - 1, y - 1, Math.round(r * scale) - 1, fill) }
  if (hi) for (const [dx, dy, r] of PUFFS) { const [x, y] = at(dx, dy); c.circ(x - 1, y - 2, Math.round(r * scale) - 3, hi) }
  if (c.frame < 2) for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {   // sparks on the pop
    const d = 7 + c.frame * 3
    c.px(12 + sx * d, 12 + sy * d, "y"); c.px(12 + sx * (d - 1), 12 + sy * (d - 1), "Y")
  }
},
  glow("wy", { r: 3, strength: 0.5, bands: 2 }))

// Death poof, 16x16, shared by every monster: a white pop that breaks into grey puffs, which drift
// outwards and shrink away. Light from the top-left like everything else.
const POOF_PUFFS = [[0, 0], [-4, -2], [4, -3], [-3, 4], [4, 3], [0, -5]]
const POOF = [ // spread, puff r, [rim, fill], fade (share of pixels dithered away)
  [0.3, 2, ["x", "w"], 0],
  [0.6, 3, ["x", "w"], 0],
  [0.9, 3, ["X", "x"], 0],
  [1.2, 3, ["X", "x"], 0.5],
  [1.5, 2, ["X", "x"], 0.75],
]
anim("fx_poof", { w: 16, h: 16, fps: 14, loop: false, frames: POOF.length }, (c) => {
  const [spread, r, [rim, fill], fade] = POOF[c.frame]
  const at = (dx, dy) => [Math.round(8 + dx * spread), Math.round(8 + dy * spread - c.frame * 0.5)]
  for (const [dx, dy] of POOF_PUFFS) { const [x, y] = at(dx, dy); c.circ(x, y, r, rim) }
  for (const [dx, dy] of POOF_PUFFS) { const [x, y] = at(dx, dy); c.circ(x - 1, y - 1, r - 1, fill) }
  if (c.frame === 2) for (const [dx, dy] of POOF_PUFFS) { const [x, y] = at(dx, dy); c.px(x - 2, y - 2, "w") }
  if (c.frame === 0) for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) c.px(8 + sx * 6, 8 + sy * 6, "w")
  if (fade) c.dither(0, 0, 16, 16, ".", "_", fade)                                  // thin out to nothing
})

// ---- Ice (cyan/white). Ice Shard flies right like the fireball: a dart, bright tip, frost flakes trailing.
const SHARD = [`
...........
....BCcc...
.c.BCcccce.
c.CCcwwwwww
...BCcccce.
....BCcc...
...........`, `
...........
....BCcc...
c..BCcccce.
.cCCcwwwwww
.c.BCcccce.
....BCcc...
...........`, `
...........
.c..BCcc...
...BCcccce.
.cCCcwwwwww
c..BCcccce.
....BCcc...
...........`]
anim("iceShard_fly", { w: 11, h: 7, fps: 12 },
  ...SHARD.map((g) => frame(grid(0, 0, g))),
  glow("wc", { r: 2, strength: 0.5, bands: 2 }))

// Shard impact, 15x15: a white pop that splits into eight splinters flying out and melting away.
const SPLINTER = [[1, 0], [0.7, 0.7], [0, 1], [-0.7, 0.7], [-1, 0], [-0.7, -0.7], [0, -1], [0.7, -0.7]]
anim("fx_iceHit", { w: 15, h: 15, fps: 16, loop: false, frames: 5 }, (c) => {
  const f = c.frame
  if (f < 2) { c.circ(7, 7, 2 - f, "w"); c.ring(7, 7, 2 + f, "c") }
  SPLINTER.forEach(([dx, dy], i) => {
    const r0 = 2 + f * 1.4, r1 = r0 + (i % 2 ? 1.5 : 2.5)
    const x0 = Math.round(7 + dx * r0), y0 = Math.round(7 + dy * r0), x1 = Math.round(7 + dx * r1), y1 = Math.round(7 + dy * r1)
    if (f < 4) c.line(x0, y0, x1, y1, f < 2 ? "w" : "c")
    c.px(x1, y1, f < 3 ? "c" : "C")
  })
},
  glow("wc", { r: 2, strength: 0.5, bands: 2 }))

// Frost on a slowed (faint) or frozen (solid) enemy, 18x18, centred on it: ice crystals grown up
// around its feet, frosty glints that twinkle near its head.
anim("fx_frozen", { w: 18, h: 18, fps: 4, frames: 3 }, (c) => {
  for (const [x, h, lean] of [[2, 4, -1], [5, 7, 0], [8, 4, 1], [11, 8, 0], [14, 5, 1], [16, 3, 0]]) {   // crystals: base x, height, tip lean
    const b = 18, tx = x + lean, ty = b - h
    c.poly([x - 1, b, tx, ty, tx + 1, ty, x + 2, b], "C")
    c.line(x, b - 1, tx, ty + 1, "c"); c.px(tx, ty, "w")
  }
  const GLINT = [[[3, 4], [13, 2]], [[14, 6], [6, 1]], [[9, 3], [2, 9]]][c.frame]
  for (const [x, y] of GLINT) { c.px(x, y, "w"); c.px(x - 1, y, "c"); c.px(x + 1, y, "c"); c.px(x, y - 1, "c"); c.px(x, y + 1, "c") }
},
  glow("w", { r: 2, strength: 0.4, bands: 2 }))

// ---- Arcane (violet/orchid). Orb, 11x11: a violet sphere lit from the top-left, two motes circling it.
anim("arcaneOrb", { w: 11, h: 11, fps: 12, frames: 6 }, (c) => {
  c.circ(5, 5, 4, "V"); c.circ(5, 5, 3, "v"); c.circ(4, 4, 2, "z"); c.circ(4, 4, 1, "l"); c.px(3, 3, "w")
  const a = c.phase * Math.PI * 2
  for (const [k, col] of [[0, "w"], [Math.PI, "l"]])
    c.px(Math.round(5 + Math.cos(a + k) * 5), Math.round(5 + Math.sin(a + k) * 4.5), col)
},
  glow("zlw", { r: 2, strength: 0.6, bands: 2 }))

sheet("fx", ["fireball*", "fx_*", "iceShard*", "arcaneOrb"])
