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

sheet("fx", ["fireball*", "fx_*"])
