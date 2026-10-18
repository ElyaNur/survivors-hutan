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

// ---- Meteor (fire family, like the fireball but heavier). The rock, flying right (turned in game):
// a dark stone lumped with molten cracks, wrapped in fire at the front, a long flame tail streaming behind.
anim("meteor_fall", { w: 26, h: 15, fps: 12, frames: 3 }, (c) => {
  const f = c.frame, cy = 7
  const TAIL = [[2, -1], [0, 1], [1, 0]][f]                                        // tail tip flicker: [extra length, y shift]
  c.poly([16, cy - 6, 2 - TAIL[0], cy + TAIL[1], 16, cy + 7], "R")                  // outer tail, cooling red
  c.poly([16, cy - 5, 5 - TAIL[0], cy + TAIL[1], 16, cy + 6], "O")
  c.poly([17, cy - 3, 9, cy + TAIL[1], 17, cy + 4], "o")
  c.poly([18, cy - 2, 12, cy, 18, cy + 3], "Y")                                     // hot core of the tail
  c.circ(19, cy, 6, "O"); c.circ(20, cy, 5, "o"); c.circ(21, cy, 4, "Y")           // fire envelope, hottest at the front
  c.ring(21, cy, 4, "y"); c.px(25, cy, "w"); c.px(25, cy - 1, "w"); c.px(25, cy + 1, "y")
  c.circ(18, cy, 4, "X"); c.circ(17, cy - 1, 2, "x"); c.px(18, cy - 1, "X")          // the stone, lit top-left
  c.px(16, cy - 2, "w"); c.hline(16, cy + 4, 4, "k"); c.vline(14, cy, 3, "k")      // glint, dark underside
  c.line(16, cy + 2, 19, cy - 1, "O"); c.px(20, cy - 1, "Y"); c.px(17, cy + 2, "o"); c.px(21, cy + 1, "y")   // molten cracks, hot front face
  for (const [x, y] of [[[6, 2], [10, 12], [3, 9]], [[8, 12], [4, 4], [11, 1]], [[5, 11], [9, 3], [2, 6]]][f]) c.px(x, y, "o")   // embers
},
  glow("wyY", { r: 3, strength: 0.5, bands: 2 }))

// Warning, sized for r 28 (scaled to r in game). One 0.8 s pass: a dithered shadow swells as the rock nears,
// the danger ring throbs and four marks close in on the spot.
function dropWarn(name, swap = {}) {                                             // Ice drops (fu_iceWarn) reuse it recoloured
  const K = (key) => swap[key] ?? key
  anim(name, { w: 59, h: 59, fps: 10, frames: 8 }, (c) => {
    const f = c.frame, C = 29, sr = Math.round(9 + f * 2.4)
    c.circ(C, C, sr, "#1d1a2f50"); c.circ(C, C, Math.round(sr * 0.6), "#1d1a2f80")   // see-through ink (k): any ground shows under it
    const hot = f % 2 === 0
    c.ring(C, C, 28, K(hot ? "Y" : "O")); c.ring(C, C, 27, K(hot ? "O" : "R"))
    const m = 24 - f * 1.6                                                           // closing marks
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const x = Math.round(C + dx * m), y = Math.round(C + dy * m)
      c.line(x - dy * 2, y - dx * 2, x + dx * 2, y + dy * 2, K("Y")); c.line(x + dy * 2, y + dx * 2, x + dx * 2, y + dy * 2, K("Y"))
      c.px(x + dx * 2, y + dy * 2, K("y"))
    }
  })
}
dropWarn("meteor_warn")

// Burning ground: one flame tuft, strewn over the area many times (desynced) in game.
anim("fx_burn", { w: 9, h: 13, fps: 10, frames: 4 }, (c) => {
  const f = c.frame, sway = [0, 1, 0, -1][f], h = [8, 9, 7, 9][f], tip = 9 - h
  c.poly([1, 9, 4 + sway, tip, 5 + sway, tip, 8, 9], "O"); c.circ(4, 9, 3, "O")     // teardrop: round base, licking tip
  c.poly([2, 10, 4 + sway, tip + 3, 7, 10], "o"); c.circ(4, 10, 2, "o")
  c.circ(4, 11, 1, "Y"); c.px(4, 10, "y"); c.px(4 + (sway > 0 ? 1 : 0), tip + 5, "Y")
  const side = f % 2 ? 1 : 7                                                        // little tongue flicking at the side
  c.vline(side, 7 - (f >> 1), 2, "O"); c.px(side, 6 - (f >> 1), "o")
  c.hline(2, 12, 5, "R")                                                            // embers at the root
  if (f === 1) c.px(6, tip - 1, "Y")                                                // a spark lifting off
  if (f === 3) c.px(2, tip, "o")
},
  glow("Yy", { r: 2, strength: 0.4, bands: 2 }))

// ---- Frost Nova (ice family, like the shard). Ring, sized to end at r 36 (scaled to r in game): a white flash
// that rushes out as a white-edged ice ring with crystal spikes, then breaks into frost.
const NOVA = [8, 16, 23, 29, 33, 36]
anim("fx_frostNova", { w: 77, h: 77, fps: 18, loop: false, frames: NOVA.length }, (c) => {
  const f = c.frame, C = 38, R = NOVA[f]
  if (f === 0) c.circ(C, C, 6, "w")
  if (f < 4) for (let y = 0; y < 77; y++) for (let x = 0; x < 77; x++) {           // frost left behind the ring
    const d = Math.hypot(x - C, y - C)
    if (d < R - 2 && d > R - 7 && (x * 3 + y * 5) % 7 === 0) c.px(x, y, f < 2 ? "c" : "C")
  }
  c.ring(C, C, R - 2, f < 4 ? "C" : "B"); c.ring(C, C, R - 1, "c"); c.ring(C, C, R, f < 4 ? "w" : "c")
  if (f > 0 && f < 5) for (let i = 0; i < 8; i++) {                                 // crystal spikes on the edge
    const a = (i + 0.5) * Math.PI / 4, ca = Math.cos(a), sa = Math.sin(a), L = f < 3 ? 4 : 3
    c.line(Math.round(C + ca * (R - 1)), Math.round(C + sa * (R - 1)), Math.round(C + ca * (R + L)), Math.round(C + sa * (R + L)), "c")
    c.px(Math.round(C + ca * (R + L)), Math.round(C + sa * (R + L)), "w")
  }
  if (f >= 4) c.dither(0, 0, 77, 77, ".", "_", f === 4 ? 0.35 : 0.65)              // melts away
},
  glow("wc", { r: 2, strength: 0.5, bands: 2 }))

// ---- Lightning (yellow-white, violet edge). Strike on a target, 15x15: a white pop with a spiked star
// that throws violet sparks and fizzles.
anim("fx_lightningHit", { w: 15, h: 15, fps: 20, loop: false, frames: 5 }, (c) => {
  const f = c.frame, C = 7, DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1], [0.7, 0.7], [-0.7, 0.7], [-0.7, -0.7], [0.7, -0.7]]
  if (f < 2) { c.circ(C, C, 3 - f, "w"); c.ring(C, C, 4 - f, "y") }
  DIRS.forEach(([dx, dy], i) => {
    const long = i < 4, r0 = 2 + f, r1 = r0 + (long ? 4 : 2) - f
    const at = (r) => [Math.round(C + dx * r), Math.round(C + dy * r)]
    if (f < 3 && r1 > r0) { const [x0, y0] = at(r0), [x1, y1] = at(r1); c.line(x0, y0, x1, y1, f ? "y" : "w"); c.px(x1, y1, "v") }
    else if (f < 5 && i % 2 === f % 2) { const [x, y] = at(r0 + 1); c.px(x, y, f < 4 ? "l" : "v") }
  })
},
  glow("wy", { r: 2, strength: 0.6, bands: 2 }))

// ---- Ultimates.
// Shatter, 21x21: an enemy that dies on Absolute Zero's ice. A white crack-star pops, then the body flies apart as
// angular ice shards that spin out, drop a little and melt.
const SHARDS = [[0.2, 4, 3], [1.1, 3, 2], [2.0, 4, 3], [2.9, 3, 2], [3.7, 4, 3], [4.5, 3, 2], [5.4, 4, 2]]   // [angle, length, width]
anim("fx_shatter", { w: 21, h: 21, fps: 16, loop: false, frames: 6 }, (c) => {
  const f = c.frame, C = 10
  if (f < 2) {                                                                      // the pop: core + cracks running out
    c.circ(C, C, 3 - f, "w")
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.3, L = 5 + f * 3; c.line(C, C, Math.round(C + Math.cos(a) * L), Math.round(C + Math.sin(a) * L), f ? "c" : "w") }
  }
  if (f === 0) return
  SHARDS.forEach(([a, L, wd], i) => {
    const d = 2 + f * 2.2, spin = a + f * (i % 2 ? 0.7 : -0.7), fall = f * f * 0.25
    const x = C + Math.cos(a) * d, y = C + Math.sin(a) * d + fall
    const ux = Math.cos(spin), uy = Math.sin(spin), nx = -uy, ny = ux
    const tipX = x + ux * L, tipY = y + uy * L, bx = x - ux * 1, by = y - uy * 1
    c.poly([Math.round(bx + nx * wd / 2), Math.round(by + ny * wd / 2), Math.round(tipX), Math.round(tipY), Math.round(bx - nx * wd / 2), Math.round(by - ny * wd / 2)], f < 4 ? "C" : "B")
    c.line(Math.round(bx), Math.round(by), Math.round(tipX), Math.round(tipY), f < 4 ? "c" : "C")
    if (f < 4) c.px(Math.round(tipX), Math.round(tipY), "w")
  })
  if (f >= 4) c.dither(0, 0, 21, 21, ".", "_", f === 4 ? 0.3 : 0.6)                // melting away
},
  glow("wc", { r: 2, strength: 0.5, bands: 2 }))

// Storm cloud, 48x22 (Badai Petir), floats over the mage: dark violet-grey puffs lit faintly from the top, an ink
// belly, and lightning flickering inside it (the puffs light up around the flash), a fork dropping out now and then.
const PUFF = [[10, 12, 7], [19, 9, 8], [29, 8, 8], [38, 11, 7], [24, 13, 8], [14, 15, 5], [34, 15, 5], [5, 15, 4], [43, 15, 4]]   // [x, y, r]
const BACK_TO_FRONT = PUFF.map((_, i) => i).sort((a, b) => PUFF[a][1] - PUFF[b][1])   // higher puffs sit behind
const FLASH = [null, null, [21, 12], null, [32, 11], null, null, [14, 13]]          // per frame: lightning inside at [x, y]
anim("stormCloud", { w: 48, h: 22, fps: 10, frames: 8 }, (c) => {
  const f = c.frame, k = c.phase * Math.PI * 2, fl = FLASH[f]
  const at = (i) => { const [x, y, r] = PUFF[i]; return [x + Math.round(Math.sin(k + i * 1.7) * 0.8), y + Math.round(Math.cos(k + i * 2.3) * 0.6), r] }
  for (let i = 0; i < PUFF.length; i++) { const [x, y, r] = at(i); c.circ(x, y, r, "k") }                    // ink rim
  for (const i of BACK_TO_FRONT) {                                                  // each puff over the ones behind it:
    const [x, y, r] = at(i)
    c.circ(x, y, r - 1, "P"); c.circ(x - 1, y - 1, r - 2, "v"); c.circ(x, y, r - 2, "V")   // shaded edge, lit top-left crescent, body
  }
  c.hline(6, 19, 36, "k")
  if (fl) {                                                                         // a flash inside: lit puffs, a hot crack
    const [x, y] = fl
    c.recolor({ P: "V", V: "v", X: "l" }, [x, y, 9])
    c.line(x - 4, y - 2, x, y + 1, "y"); c.line(x, y + 1, x + 3, y - 1, "y"); c.line(x + 3, y - 1, x + 6, y + 2, "w")
    c.px(x, y + 1, "w")
    if (f === 2 || f === 7) { c.line(x, y + 2, x - 2, y + 6, "y"); c.line(x - 2, y + 6, x, y + 9, "w") }   // fork out of the belly
  } else for (const [x, y] of [[[16, 14], [30, 12]], [[25, 15]], [[12, 13], [36, 14]]][f % 3]) c.px(x, y, "v")   // glints inside
},
  glow("wy", { r: 3, strength: 0.6, bands: 2 }))

// Ult unlock flash, 64x64, on the mage when a recipe completes: a white burst, eight golden rays shooting out
// (long and short), an expanding gold ring, sparkles at the end.
anim("fx_ultFlash", { w: 64, h: 64, fps: 14, loop: false, frames: 7 }, (c) => {
  const f = c.frame, C = 32
  if (f < 3) { c.circ(C, C, 7 - f * 2, "w"); c.ring(C, C, 8 - f * 2, "y") }
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 + Math.PI / 8, long = i % 2 === 0, r0 = 4 + f * 3, r1 = r0 + (long ? 16 : 9) - f * 2
    if (r1 <= r0) continue
    const x0 = Math.round(C + Math.cos(a) * r0), y0 = Math.round(C + Math.sin(a) * r0), x1 = Math.round(C + Math.cos(a) * r1), y1 = Math.round(C + Math.sin(a) * r1)
    c.line(x0, y0, x1, y1, f < 2 ? "w" : f < 4 ? "y" : "Y", long && f < 3 ? 2 : 1)
    c.px(x1, y1, "w")
  }
  const R = 6 + f * 4
  if (f >= 1 && f < 6) { c.ring(C, C, R, f < 3 ? "y" : "Y"); if (f < 4) c.ring(C, C, R - 1, "o") }
  if (f >= 4) for (let i = 0; i < 6; i++) { const a = i * 1.05 + f; c.px(Math.round(C + Math.cos(a) * (R + 3)), Math.round(C + Math.sin(a) * (R + 3)), f < 6 ? "w" : "y") }
  if (f >= 5) c.dither(0, 0, 64, 64, ".", "_", f === 5 ? 0.3 : 0.6)
},
  glow("wy", { r: 3, strength: 0.5, bands: 2 }))

// ---- Pohon Tua (boss). Roots warning, sized for rootR 20: one 1.0 s pass under the player's feet. The ground
// darkens, cracks run out from the middle, a red danger ring throbs faster and faster, and root tips start
// poking through just before they burst. Red, so it never reads as the mage's own golden meteor warning.
const CRACKS = [[0.3, 17], [1.3, 15], [2.2, 18], [3.2, 14], [4.1, 17], [5.2, 16]]   // [angle, full length]
anim("roots_warn", { w: 45, h: 45, fps: 10, frames: 10 }, (c) => {
  const f = c.frame, C = 22, g = (f + 1) / 10
  c.circ(C, C, Math.round(8 + g * 12), "#1d1a2f40"); c.circ(C, C, Math.round(4 + g * 8), "#1d1a2f50")   // see-through ink
  for (const [a, L] of CRACKS) {
    const len = Math.round(L * Math.min(1, g * 1.4)), ca = Math.cos(a), sa = Math.sin(a)
    for (let i = 2; i <= len; i++) c.px(Math.round(C + ca * i + Math.sin(i * 0.9 + a) * 0.8), Math.round(C + sa * i), "N")
    if (f >= 7) { const x = Math.round(C + ca * len), y = Math.round(C + sa * len); c.px(x, y - 1, "n"); c.px(x, y - 2 - (f - 7), "u") }   // tips poke through
  }
  const hot = f < 5 ? f % 2 === 0 : true                                    // throbs, then holds bright: it's coming
  c.ring(C, C, 20, hot ? "i" : "r"); c.ring(C, C, 19, hot ? "r" : "R")
  if (f >= 5 && f % 2) c.ring(C, C, 21, "r")
})

// Roots bursting out of the ground, 45x61, centred on the warned circle (rows 10..50): a ring of dirt
// jumps up, thorny roots stab out and up, hold, then sink back as the clods fall.
const SPIKES = [[-13, 4, 14, -1], [-6, -6, 18, 0], [1, 2, 24, 1], [8, -8, 16, 0], [14, 3, 13, 1], [-2, 10, 12, -1], [6, 9, 15, 1]]   // [dx, dy, height, lean]
const RISE = [0.25, 0.8, 1, 1, 0.6, 0.25]
anim("roots_hit", { w: 45, h: 61, fps: 12, loop: false, frames: RISE.length }, (c) => {
  const f = c.frame, C = 22, G = 30
  c.circ(C, G, 18, "#1d1a2f50")
  for (let i = 0; i < 12; i++) {                                            // dirt clods thrown out
    const a = i * 0.52 + 0.2, d = 10 + f * 3, up = f * 4 - f * f * 0.8
    c.px(Math.round(C + Math.cos(a) * d), Math.round(G + Math.sin(a) * d * 0.8 - up), i % 3 ? "N" : "D")
  }
  for (const [dx, dy, h0, lean] of SPIKES) {
    const h = Math.round(h0 * RISE[f]), x = C + dx, b = G + dy
    if (h < 2) continue
    c.poly([x - 3, b + 1, x + lean * 2, b - h, x + lean * 2 + 1, b - h, x + 4, b + 1], "N")
    c.line(x + 4, b, x + lean * 2 + 1, b - h, "k")                          // ink right edge: reads on grass
    c.line(x - 2, b, x + lean * 2, b - h + 1, "n"); c.px(x + lean * 2, b - h, "u")   // lit left edge, pale tip
    if (h > 8) { c.px(x + 2 + lean, b - Math.round(h * 0.5), "N"); c.px(x + 3 + lean, b - Math.round(h * 0.5) - 1, "N") }   // a thorn
    c.hline(x - 3, b + 1, 8, "k")                                           // the hole it came out of
  }
  if (f >= 4) c.dither(0, 0, 45, 61, ".", "_", f === 4 ? 0.3 : 0.6)
})

// ---- Fusions (prefix fu_).
// Lubang Hitam, 61x33: an ink-black core with a tilted accretion disc spinning around it (white-hot inside, cooling
// through lavender and orchid to violet, dark lanes between the arms), the side turning toward us brighter, and a
// white photon ring arching over the top. The disc's back half goes behind the core, its front half across it.
const BH = { C: [30, 16], rx: 30, ry: 8, core: 10 }
const inDisc = (dx, dy) => Math.hypot(dx / BH.rx, dy / BH.ry) <= 1
function bhDisc(c, front) {
  const [cx, cy] = BH.C, k = c.phase * Math.PI * 2
  for (let y = cy - BH.ry; y <= cy + BH.ry; y++) for (let x = cx - BH.rx; x <= cx + BH.rx; x++) {
    const dx = x - cx, dy = y - cy, u = dx / BH.rx, v = dy / BH.ry, rho = Math.hypot(u, v)
    if (rho > 1 || (dy > 0) !== front) continue
    if (!front && Math.hypot(dx, dy) <= BH.core + 3) continue                    // behind the core and its ring
    const arm = Math.sin(2 * Math.atan2(v, u) - 10 * rho - k)                     // two spiral arms, turning
    const val = (1 - rho) * 1.3 + 0.3 * arm - 0.2 * u                            // hotter inside; the left side beams toward us
    c.px(x, y, val > 1.0 ? "w" : val > 0.78 ? "l" : val > 0.52 ? "z" : val > 0.28 ? "v" : val > 0.08 ? "V" : "P")
  }
}
const coreDome = (c, key) => {                                                   // the core where the front disc doesn't cover it
  const [cx, cy] = BH.C
  for (let y = cy - BH.core; y <= cy + BH.core; y++) for (let x = cx - BH.core; x <= cx + BH.core; x++)
    if (Math.hypot(x - cx, y - cy) <= BH.core + 0.4 && !(y > cy && inDisc(x - cx, y - cy))) c.px(x, y, key)
}
anim("fu_blackHole", { w: 61, h: 33, fps: 12, frames: 8 }, (c) => {
  const [cx, cy] = BH.C, k = c.phase * Math.PI * 2
  bhDisc(c, false)
  c.ring(cx, cy, BH.core + 3, "z"); c.ring(cx, cy, BH.core + 2, "l"); c.ring(cx, cy, BH.core + 1, "w")   // the photon ring: light bent
                                                                                  // round the core, over the top and under the disc
  coreDome(c, "k")
  bhDisc(c, true)
  for (let i = 0; i < 3; i++) {                                                   // hot clumps riding the disc
    const a = k + i * 2.1, x = Math.round(cx + Math.cos(a) * BH.rx * 0.72), y = Math.round(cy + Math.sin(a) * BH.ry * 0.72)
    if (Math.sin(a) > 0 || Math.hypot(x - cx, y - cy) > BH.core + 2) { c.px(x, y, "w"); c.px(x + (Math.sin(a) > 0 ? 1 : -1), y, "l") }
  }
},
  glow("wl", { r: 3, strength: 0.6, bands: 2 }),
  (c) => coreDome(c, "k"))                                                        // after the glow: the core stays pitch black

// The gravity well under it, sized for r 80 (scaled to r in game): see-through ink deepening to the middle, three
// thin spiral arms of darker ink and violet dust winding inward.
anim("fu_blackHole_well", { w: 161, h: 161, fps: 10, frames: 8 }, (c) => {
  const C = 80, k = c.phase * Math.PI * 2
  for (let y = 0; y < 161; y++) for (let x = 0; x < 161; x++) {
    const dx = x - C, dy = y - C, d = Math.hypot(dx, dy) / 80
    if (d > 1) continue
    const arm = Math.sin(3 * Math.atan2(dy, dx) + 11 * Math.sqrt(d) * 2 + k)
    const ink = (1 - d) ** 1.4 + (arm > 0.7 ? 0.22 * (1 - d * 0.7) : 0)
    if (ink > 0.75) c.px(x, y, "#1d1a2fb0")
    else if (ink > 0.5) c.px(x, y, "#1d1a2f80")
    else if (ink > 0.3) c.px(x, y, "#1d1a2f58")
    else if (ink > 0.14) c.px(x, y, "#1d1a2f38")
    else if (ink > 0.04 && (x + y) % 2 === 0) c.px(x, y, "#1d1a2f30")
    if (arm > 0.93 && d > 0.2 && d < 0.92 && (x * 7 + y * 3) % 5 === 0) c.px(x, y, d < 0.55 ? "#d87bffc0" : "#9b5de5a0")   // dust in the arms (palette z, v)
  }
})

// The collapse, sized for r 80 (scaled to r in game): the core pinches to a point, bursts into a white flash with rays,
// then a thick violet shockwave rushes out over a lavender haze, flinging debris, and fades.
const speck = (x, y, f) => { let h = (x * 374761393 + y * 668265263 + f * 2246822519) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296 }   // 0..1 hash: scattered, no stripes
const BOOM_R = [0, 15, 28, 40, 51, 61, 70, 76, 80]
anim("fu_blackHole_boom", { w: 167, h: 167, fps: 16, loop: false, frames: BOOM_R.length }, (c) => {
  const f = c.frame, C = 83, R = BOOM_R[f]
  const at = (a, d) => [Math.round(C + Math.cos(a) * d), Math.round(C + Math.sin(a) * d)]
  if (f === 0) { c.ring(C, C, 7, "z"); c.ring(C, C, 5, "l"); c.ring(C, C, 4, "w"); c.circ(C, C, 3, "k"); c.px(C, C, "w"); return }
  if (f >= 2) {                                                                   // haze inside the wave, thinning out
    for (let y = C - R; y <= C + R; y++) for (let x = C - R; x <= C + R; x++) {
      const d = Math.hypot(x - C, y - C)
      if (d < R - 5 && d > R * 0.3 && speck(x, y, f) < (d / R) * (f < 5 ? 0.55 : 0.3)) c.px(x, y, d > R * 0.7 ? "z" : "v")
    }
  }
  if (f < 4) c.circ(C, C, [0, 13, 15, 11][f], f === 1 ? "w" : f === 2 ? "l" : "z")   // the flash, cooling
  if (f < 4) for (let i = 0; i < 16; i++) {                                       // rays out of the flash
    const a = i * Math.PI / 8 + 0.2, long = i % 2 === 0, r0 = [0, 14, 18, 22][f], r1 = r0 + (long ? 22 : 12) - f * 4
    const [x0, y0] = at(a, r0), [x1, y1] = at(a, r1)
    c.line(x0, y0, x1, y1, f === 1 ? "w" : f === 2 ? "l" : "z", long && f < 3 ? 2 : 1); c.px(x1, y1, "w")
  }
  if (f >= 2) {                                                                   // the shockwave: white front, colour behind
    c.ring(C, C, R - 5, "P"); c.ring(C, C, R - 4, "V"); c.ring(C, C, R - 3, "v"); c.ring(C, C, R - 2, "z"); c.ring(C, C, R - 1, "l")
    c.ring(C, C, R, f < 6 ? "w" : "l")
    if (f < 6) c.ring(C, C, R + 1, "l")
  }
  for (let i = 0; i < 24; i++) {                                                  // debris flung out ahead of the wave
    const a = i * 0.262 + (i % 2) * 0.13, d = R + 4 + (i % 3) * 3
    if (f === 0 || d > 82) continue
    const [x, y] = at(a, d), [x2, y2] = at(a, d - 3)
    c.line(x2, y2, x, y, i % 4 === 0 ? "o" : "z"); c.px(x, y, i % 4 === 0 ? "Y" : "w")
  }
  if (f >= 6) c.dither(0, 0, 167, 167, ".", "_", f === 6 ? 0.35 : f === 7 ? 0.6 : 0.8)
},
  glow("wl", { r: 3, strength: 0.6, bands: 2 }))

// Cincin Matahari: a sun, 25x25 + ink outline. White-hot core, gold body shaded to an orange limb low-right, an ink
// rim (it must read over a green crowd and smoke), and a corona of licking flame whose edge boils round it.
const SUN_C = 12
const sunRim = (c) => { for (let y = 0; y < 25; y++) for (let x = 0; x < 25; x++) { const d = Math.hypot(x - SUN_C, y - SUN_C); if (d > 6.4 && d <= 7.4) c.px(x, y, "k") } }
anim("fu_sun", { w: 25, h: 25, fps: 10, frames: 6, outline: "k" }, (c) => {
  const C = SUN_C, k = c.phase * Math.PI * 2
  for (let y = 0; y < 25; y++) for (let x = 0; x < 25; x++) {                    // corona: wavy flame edge, hotter inside
    const dx = x - C, dy = y - C, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx)
    const R = 9 + 1.4 * Math.sin(6 * a + k) + 1.1 * Math.sin(4 * a - 2 * k) + 0.6 * Math.sin(9 * a + 3 * k)
    if (d > R || d <= 7) continue
    c.px(x, y, d > R - 1 ? "O" : d > R - 2.2 ? "o" : "Y")
  }
  sunRim(c)
  c.circ(C, C, 6, "o"); c.circ(C - 1, C - 1, 5, "Y"); c.circ(C - 2, C - 2, 3, "y")
  c.px(C - 3, C - 3, "w"); c.px(C - 2, C - 3, "w"); c.px(C - 3, C - 2, "w"); c.px(C - 2, C - 2, "w"); c.px(C - 1, C - 3, "w")
  const spot = [[3, 1], [2, 3], [1, 3], [3, 2], [2, 2], [3, 0]][c.frame]         // a cooler spot drifting on the limb
  c.px(C + spot[0], C + spot[1], "o")
},
  glow("wyY", { r: 3, strength: 0.5, bands: 2 }),
  sunRim)                                                                          // after the glow: the rim stays ink

// Phoenix Api-Es, 40x34 + ink outline, side view flying right (flipped in game). A white-gold firebird: the near wing is
// fire (gold, orange, red-tipped primaries), the far wing ice (white, pale ice, cyan, blue tips), a flame crest, a hooked
// gold beak and a long tail of fire and ice streamers with eye-spots, all flapping on one beat.
const PHX = { root: [20, 17], far: [23, 16], L: 13, FIRE: ["y", "Y", "o", "O", "R"], ICE: ["w", "c", "C", "B", "M"] }
function phxWing(c, [rx, ry], a, L, [lead, hot, mid, cool, tip]) {
  const dx = Math.cos(a), dy = Math.sin(a), sg = dy < 0 ? -1 : 1, R = Math.round   // sg: the turn that swings a feather toward the tail
  for (let i = 6; i >= 0; i--) {                                                  // inner feathers first, the long primaries on top
    const along = 1 - 0.14 * i, th = sg * (0.15 + 0.3 * i), ux = Math.cos(a + th), uy = Math.sin(a + th)
    const bx = rx + dx * L * along, by = ry + dy * L * along, len = [11, 11, 10, 9, 8, 7, 6][i] * L / PHX.L
    const nx = -uy * sg, ny = ux * sg                                             // across the feather, toward its trailing side
    const at = (k, w = 0) => [R(bx + ux * len * k + nx * w), R(by + uy * len * k + ny * w)]
    c.poly([...at(0, -1.5), ...at(0.55, -1.2), ...at(1), ...at(0.55, 1.2), ...at(0, 1.5)], mid)
    c.poly([...at(0, -1.5), ...at(0.4, -1), ...at(0.4, 1), ...at(0, 1.5)], hot)
    c.line(...at(0.3, 1), ...at(0.95, 1), cool); c.line(...at(0.8), ...at(1), cool); c.px(...at(1), tip)   // shaded trailing side, dark tip
    c.line(...at(0, -1), ...at(0.5, -1), lead)                                    // its leading edge catching the light
  }
  c.line(rx, ry, R(rx + dx * L), R(ry + dy * L), lead, 2)                         // the arm
}
function phxTail(c, k) {                                                          // streamers rippling back from the rump
  const S = [[19, 0.32, 0, "YoO", 1], [21, 0.62, 1.6, "cCB", 2], [20, 0.95, 3.2, "oOR", 7]]   // [root y, droop, wave phase, keys, last x]
  for (const [y0, droop, ph, keys, end] of S) {
    let px = 14, py = y0
    for (let x = 13; x >= end; x--) {
      const t = (14 - x) / 14, y = Math.round(y0 + (14 - x) * droop + Math.sin(x * 0.4 + k + ph) * 1.2 * t)
      c.line(px, py, x, y, keys[Math.min(2, (t * 3) | 0)], t < 0.6 ? 2 : 1); px = x; py = y
    }
    if (end < 3) { c.px(px, py, keys[0] === "Y" ? "y" : "w"); c.px(px + 1, py, keys[0]) }   // a bright tip
  }
}
function phxBody(c, k) {
  c.ellipse(19, 19, 7, 4, "o", true); c.ellipse(19, 18, 6, 3, "Y", true); c.ellipse(20, 17, 4, 1, "y", true)   // lit from above
  c.hline(14, 22, 9, "C"); c.hline(16, 23, 5, "B")                                // icy underside
  c.circ(27, 14, 4, "o"); c.circ(27, 13, 3, "Y"); c.circ(26, 12, 1, "y")         // head
  c.poly([30, 12, 36, 14, 34, 16, 30, 16], "Y"); c.line(31, 16, 34, 16, "O"); c.px(36, 14, "o"); c.px(35, 15, "O")   // hooked beak
  c.px(28, 13, "w"); c.px(29, 13, "k"); c.px(29, 12, "k"); c.px(28, 12, "k")      // fierce eye under a dark brow
  const sway = Math.round(Math.sin(k) * 1)
  c.line(26, 11, 21, 4 + sway, "O"); c.line(27, 11, 24, 3 - sway, "o"); c.line(28, 11, 27, 5 + sway, "Y")   // flame crest
  c.px(21, 4 + sway, "Y"); c.px(24, 3 - sway, "y"); c.px(27, 5 + sway, "w")
  c.line(19, 20, 23, 17, "w")                                                     // white-hot heart
}
const FLAP = [-105, -62, 28, -62]                                                 // wing angle per frame: raised, sweeping, down, sweeping
anim("fu_phoenix", { w: 40, h: 34, fps: 8, frames: FLAP.length, outline: "k" }, (c) => {
  const k = c.phase * Math.PI * 2, a = FLAP[c.frame] * Math.PI / 180
  const L = PHX.L * (0.62 + 0.38 * Math.abs(Math.sin(a)))                        // foreshortened as it sweeps past us
  phxWing(c, PHX.far, a + 0.45, L * 0.9, PHX.ICE)
  phxTail(c, k)
  phxBody(c, k)
  phxWing(c, PHX.root, a, L, PHX.FIRE)
})

// The ice wing's trail: a tuft of frost crystals shot up out of a rime patch (strewn like fx_burn's flames in game).
anim("fu_frost", { w: 11, h: 11, fps: 6, frames: 3, outline: "B" }, (c) => {
  c.ellipse(5, 9, 5, 1, "c", true); c.hline(1, 10, 9, "C")                       // rime on the ground
  for (const [x, h, lean] of [[2, 4, -1], [5, 8, 0], [8, 5, 1]]) {                // prisms: base x, height, tip lean; lit left face, cyan right face
    const tx = x + lean, ty = 9 - h
    c.poly([x - 1, 9, tx, ty, x + 1, 9], "C"); c.line(x - 1, 9, tx, ty + 1, "c"); c.line(x, 9, tx, ty + 1, "c"); c.px(tx, ty, "w")
  }
  c.line(4, 6, 4, 8, "w")                                                         // the tall one's bright edge
  const [gx, gy] = [[5, 1], [8, 4], [1, 5]][c.frame]                              // a glint hopping between the tips
  c.px(gx, gy, "w"); c.px(gx, gy - 1, "w")
})

// Gletser, 46x42 + ink outline: a giant chunk of glacier ice. Crystal spikes jut from a snowy top, a pale-ice front face is
// cut into facets with white cracks running down it, a blue shaded side, deep navy at the foot; a shine sweeps across it.
const GL = {
  spikes: [[[9, 17, 6, 4, 15, 14], [6, 4, 9, 17]], [[22, 9, 27, 0, 31, 9], [27, 0, 24, 9]], [[34, 12, 41, 3, 40, 13], [41, 3, 36, 12]]],   // [poly, lit edge]
  top: [6, 16, 14, 9, 22, 8, 25, 4, 28, 8, 40, 11, 36, 18, 12, 20],
  front: [6, 16, 12, 20, 36, 18, 38, 39, 23, 41, 4, 38],
  side: [36, 18, 40, 11, 45, 16, 44, 35, 38, 39],
  facets: [[[12, 20, 22, 19, 17, 30, 8, 28], "c"], [[22, 19, 36, 18, 33, 26, 25, 27], "c"], [[17, 30, 25, 27, 28, 37, 15, 38], "s"]],
  snow: [9, 15, 15, 10, 22, 10, 25, 6, 28, 10, 38, 12, 34, 16, 24, 17, 13, 17],
  drips: [[14, 17, 3], [21, 17, 2], [30, 16, 4]],                                 // [x, y, length]: snow hanging over the front rim
  cracks: [[14, 21, 16, 26, 13, 31], [27, 19, 26, 24, 29, 28, 28, 33], [33, 19, 34, 25]],
}
anim("fu_glacier", { w: 46, h: 42, fps: 10, frames: 6, outline: "k" }, (c) => {
  for (const [pts, lit] of GL.spikes) { c.poly(pts, "C"); c.line(...lit, "c"); c.px(lit[0], lit[1], "w") }
  c.poly(GL.front, "C"); c.poly(GL.side, "B"); c.poly(GL.top, "c")
  for (const [pts, key] of GL.facets) c.poly(pts, key)
  c.poly([4, 34, 23, 37, 38, 35, 38, 39, 23, 41, 4, 38], "B"); c.poly([38, 34, 44, 31, 44, 35, 38, 39], "M")   // shaded foot
  c.hline(6, 41, 17, "M")
  c.poly(GL.snow, "w")
  for (const [x, y, n] of GL.drips) { c.vline(x, y, n, "w"); c.px(x, y + n, "c") }
  c.line(6, 16, 12, 20, "w"); c.line(36, 18, 40, 11, "c")                         // bright rims
  for (const k of GL.cracks) for (let i = 0; i + 3 < k.length; i += 2) c.line(k[i], k[i + 1], k[i + 2], k[i + 3], "w")
  c.line(40, 13, 43, 17, "C"); c.line(41, 20, 42, 28, "C")                        // light caught on the side
  const sx = -14 + c.frame * 12                                                   // the shine: a diagonal band sweeping left to right
  for (let y = 0; y < 42; y++) for (let x = 0; x < 46; x++) {
    const d = x - sx - (42 - y) * 0.5
    if (d >= 0 && d < 3 && c.is(x, y, "Ccs")) c.px(x, y, d < 1 ? "w" : "c")
  }
})

// Pagar Kristal, 15x24 + ink outline: a fence post of ice. Three prisms stabbed into a cracked dirt mound (lit left face,
// cyan right face, white edge), charged: a spark crackles on the tall one's tip and violet sparks jump off it.
const KR = [[7, 19, 0, 2], [3, 10, -2, 1.5], [11, 12, 2, 1.5]]                   // prisms: [base x, height, tip lean, half width]
anim("fu_crystal", { w: 15, h: 24, fps: 12, frames: 4, outline: "k" }, (c) => {
  const B = 21
  for (const [x, h, lean, w] of [KR[1], KR[2], KR[0]]) {                         // side prisms behind the tall one
    const tx = x + lean, ty = B - h, l = Math.round(x - w), r = Math.round(x + w)
    c.poly([l, B, tx, ty, r, B], "C"); c.poly([l, B, tx, ty, x, B], "c")
    c.line(x, B - 1, tx, ty + 1, "w"); c.px(tx, ty, "w"); c.line(r, B, tx + (lean > 0 ? 0 : 1), ty + 2, "B")
  }
  c.ellipse(7, 22, 6, 1, "N", true); c.hline(3, 22, 9, "n"); c.px(5, 22, "N"); c.px(9, 22, "N")   // the dirt it's stabbed into
  const f = c.frame, T = [7, 2]                                                   // the charge on the tip
  const RAYS = [[[0, -2], [2, 0], [-2, 1]], [[-2, -1], [1, -2], [2, 2]], [[2, -1], [-1, -2], [-2, 2]], [[0, -2], [-2, 0], [2, 1]]][f]
  c.px(T[0], T[1], "w")
  for (const [dx, dy] of RAYS) { c.line(T[0], T[1], T[0] + dx, T[1] + dy, "y"); c.px(T[0] + dx, T[1] + dy, "w") }
  for (const [x, y] of [[[3, 6], [12, 9]], [[1, 11], [13, 5]], [[4, 3], [11, 12]], [[2, 8], [13, 10]]][f]) c.px(x, y, "l")
})

// Komet Es, 46x23, flying right (turned in game like meteor_fall, but bigger): an angular ice nucleus with a navy rim and
// white-lit faces in a frosty halo, a long tail streaming behind it, blue at the edge to a white core, ice chips glinting.
anim("fu_comet", { w: 46, h: 23, fps: 12, frames: 3 }, (c) => {
  const f = c.frame, cy = 11
  const STRANDS = [[-5, 0.13, 24, "B"], [5, -0.13, 22, "B"], [-2, 0.05, 30, "w"], [2, -0.05, 18, "w"]]   // [dy at the head, spread/px, length, key]
  for (let x = 0; x <= 32; x++) {                                                 // the tail's body: a cone, dithered out at the far end
    const t = (32 - x) / 32, hw = 4 + 3 * t, wav = Math.sin(x * 0.45 + f * 2.1) * t
    for (let y = Math.round(cy - hw + wav); y <= Math.round(cy + hw + wav); y++) {
      const k = Math.abs(y - cy - wav) / hw
      if (t > 0.55 && (x + y + f) % 2 && t + (1 - k) * 0.2 > 0.7) continue
      if (t > 0.8 && (x * 3 + y) % 3) continue
      c.px(x, y, k > 0.7 ? "C" : k > 0.3 || t > 0.5 ? "c" : "w")
    }
  }
  for (const [dy0, k, len, key] of STRANDS) {                                     // streaks fanning back from the head
    const n = len - [0, 3, 1][(f + Math.abs(dy0)) % 3]
    for (let i = 0; i <= n; i++) {
      const x = 32 - i, y = Math.round(cy + dy0 * (1 - i / 60) - k * i * 1.4 + Math.sin(i * 0.5 + f * 2) * 0.5 * (i / n))
      c.px(x, y, key); if (i < n * 0.6 && key === "B") c.px(x, y + Math.sign(dy0), key)
    }
  }
  for (let y = cy - 9; y <= cy + 9; y++) for (let x = 28; x < 46; x++) {           // coma: dithered frost round the head
    const d = Math.hypot(x - 37, (y - cy) * 1.1)
    if (d > 6 && d < 9 && (x + y) % 2 === 0 && (x > 33 || (y - cy) ** 2 > 16)) c.px(x, y, d < 7.5 ? "c" : "C")
  }
  for (let a = -1.1; a <= 1.1; a += 0.08) c.px(Math.round(37 + Math.cos(a) * 8.5), Math.round(cy + Math.sin(a) * 8.5), Math.abs(a) < 0.5 ? "w" : "c")   // bow shock
  c.poly([30, cy - 1, 33, cy - 6, 39, cy - 7, 43, cy - 2, 42, cy + 3, 37, cy + 6, 32, cy + 5], "M")   // the nucleus: a jagged chunk, navy rim
  c.poly([31, cy - 1, 34, cy - 5, 39, cy - 6, 42, cy - 2, 41, cy + 2, 37, cy + 5, 33, cy + 4], "C")
  c.poly([31, cy - 1, 34, cy - 5, 39, cy - 6, 36, cy - 1], "c"); c.poly([36, cy - 1, 39, cy - 6, 42, cy - 2], "w")   // lit facets
  c.poly([36, cy - 1, 42, cy - 2, 41, cy + 2, 37, cy + 5], "B")                    // shaded front-low facet
  c.line(34, cy - 4, 37, cy - 5, "w"); c.px(32, cy, "c"); c.line(34, cy + 3, 36, cy + 1, "c")
  for (const [x, y] of [[[6, 8], [14, 15], [21, 5], [25, 17]], [[9, 14], [17, 6], [23, 16], [4, 10]], [[12, 7], [19, 16], [26, 5], [7, 13]]][f]) { c.px(x, y, "w"); c.px(x + 1, y, "c") }   // ice chips shed behind
})

// Ice drop warning (Komet Es, Gletser), sized for r 28 like meteor_warn and drawn the same way, in ice: the shadow
// swells, a cyan ring throbs, four marks close in.
dropWarn("fu_iceWarn", { Y: "c", O: "C", R: "B", y: "w" })

// The comet's head stuck in the ground after the impact, 27x23 + ink outline: an ice chunk with spikes burst up round it,
// cracking open over its three frames until it bursts into shards.
const CORE_SPIKES = [[3, 19, -3, 8], [8, 19, -1, 12], [19, 19, 1, 11], [24, 19, 3, 7]]   // [base x, base y, tip lean, height]
const CORE = [6, 12, 10, 5, 17, 4, 22, 10, 20, 17, 13, 20, 7, 18]                 // the nucleus: a jagged chunk (like fu_comet's)
const CORE_CRACKS = [[[14, 7, 13, 11]], [[14, 7, 13, 11, 15, 14], [10, 10, 8, 14], [18, 9, 20, 12]],
  [[14, 7, 13, 11, 15, 14, 14, 18], [10, 10, 8, 14, 9, 17], [18, 9, 20, 12, 18, 16], [12, 6, 10, 8], [16, 5, 18, 7]]]
anim("fu_comet_core", { w: 27, h: 23, fps: 10, frames: 3, loop: false, outline: "k" }, (c) => {
  const f = c.frame
  c.poly([0, 20, 4, 18, 22, 18, 26, 20, 22, 22, 4, 22], "B"); c.poly([2, 20, 5, 19, 21, 19, 24, 20, 21, 21, 5, 21], "c")   // frost crust round the hole
  for (const [x, y, lean, h] of CORE_SPIKES) {
    const tx = x + lean, ty = y - h
    c.poly([x - 2, y, tx, ty, x + 2, y], "C"); c.poly([x - 2, y, tx, ty, x, y], "c"); c.line(x, y - 1, tx, ty + 1, "w"); c.px(tx, ty, "w")
  }
  c.poly(CORE, "M"); c.poly([7, 12, 10, 6, 17, 5, 21, 10, 19, 16, 13, 19, 8, 17], "C")
  c.poly([7, 12, 10, 6, 17, 5, 13, 11], "c"); c.poly([13, 11, 17, 5, 21, 10], "w"); c.poly([13, 11, 21, 10, 19, 16, 13, 19], "B")   // lit and shaded facets
  for (const k of CORE_CRACKS[f]) for (let i = 0; i + 3 < k.length; i += 2) c.line(k[i], k[i + 1], k[i + 2], k[i + 3], f < 2 ? "M" : "w")
  if (f === 2) { c.recolor({ M: "y", B: "c" }, CORE); c.px(13, 11, "w") }          // light bursting through the cracks
})

// Supernova: the ring of star-fire rushing out of the mage, one upright tongue (strewn round the ring in game, desynced).
// Hotter than any fire on the field: a blue-white heart at the root, white and pale gold up the middle, gold, an orange
// edge and red licking tips. No outline: the brightness is its read (the ring's ink underline is drawn in game).
anim("fu_novaFlame", { w: 11, h: 18, fps: 12, frames: 4 }, (c) => {
  const f = c.frame, sway = [0, 1, 0, -1][f], tip = [1, 0, 2, 1][f], B = 14
  c.poly([0, B, 5 + sway, tip, 10, B], "O"); c.circ(5, B, 5, "O")                 // teardrop: round root, licking tip
  c.poly([1, B, 5 + sway, tip + 3, 9, B], "o"); c.circ(5, B, 4, "o")
  c.poly([2, B + 1, 5 + sway, tip + 6, 8, B + 1], "Y"); c.circ(5, B + 1, 3, "Y")
  c.poly([3, B + 1, 5 + (sway > 0 ? 1 : 0), tip + 9, 7, B + 1], "y"); c.circ(5, B + 1, 2, "y")
  c.vline(5, B - 2, 3, "w"); c.hline(4, B + 1, 3, "w")                           // white-hot middle
  c.hline(4, B + 2, 3, "c"); c.px(5, B + 3, "c"); c.px(3, B + 2, "C"); c.px(7, B + 2, "C")   // the blue-white star heart
  c.px(5 + sway, tip + 1, "R")
  const side = f % 2 ? 1 : 9                                                      // a little tongue flicking at the side
  c.vline(side, B - 4 - (f >> 1), 3, "O"); c.px(side, B - 5 - (f >> 1), "o")
  if (f === 1) c.px(7, tip + 1, "Y")                                              // sparks lifting off
  if (f === 3) c.px(2, tip + 2, "y")
},
  glow("wyc", { r: 2, strength: 0.5, bands: 2 }))

// The burning ground the ring leaves: a low star-fire tuft with blue-white embers at the root (Meteor's ground burns
// orange; this burns gold and white).
anim("fu_starfire", { w: 9, h: 12, fps: 10, frames: 4 }, (c) => {
  const f = c.frame, sway = [0, 1, 0, -1][f], tip = [3, 2, 4, 2][f]
  c.poly([1, 8, 4 + sway, tip, 5 + sway, tip, 8, 8], "o"); c.circ(4, 8, 3, "o")
  c.poly([2, 9, 4 + sway, tip + 3, 7, 9], "Y"); c.circ(4, 9, 2, "Y")
  c.circ(4, 10, 1, "y"); c.px(4, 9, "w"); c.px(4 + (sway > 0 ? 1 : 0), tip + 4, "y")
  c.hline(1, 11, 7, "C"); c.px(3, 11, "c"); c.px(6, 11, "c")                       // frost-blue embers at the root
  if (f === 1) c.px(6, tip - 1, "y")
  if (f === 3) c.px(2, tip, "Y")
},
  glow("wy", { r: 2, strength: 0.4, bands: 2 }))

// Bola Plasma, 43x43 + ink outline: a big ball of violet plasma round a white-gold fire heart, lightning veins crawling over
// its skin and sparks jumping off it; an ink rim inside the shell so it reads over the crowd.
const PL = 21, PR = 16                                                           // centre; shell radius
anim("fu_plasma", { w: 43, h: 43, fps: 12, frames: 6, outline: "k" }, (c) => {
  const k = c.phase * Math.PI * 2
  for (let y = 0; y < 43; y++) for (let x = 0; x < 43; x++) {                    // the body: the heart, then the shell lit top-left
    const dx = x - PL, dy = y - PL, d = Math.hypot(dx, dy)
    if (d > PR + 0.4) continue
    const swirl = Math.sin(3 * Math.atan2(dy, dx) + d * 0.6 - k * 2)               // plasma currents turning in the shell
    let key = d > PR - 0.6 ? "V" : d < 4 ? "w" : d < 6 ? "y" : d < 8.2 + swirl * 0.8 ? "Y" : "v"
    if (key === "v") key = dx + dy < -13 ? (swirl > 0.3 ? "l" : "z") : dx + dy > 11 && d > 12.6 ? "P" : swirl > 0.55 ? "v" : "V"
    c.px(x, y, key)
  }
  for (let i = 0; i < 4; i++) {                                                   // veins: kinked lightning over the skin, from the heart outward
    let a = -k + i * 1.571, r = 8.5, px = Math.round(PL + Math.cos(a) * r), py = Math.round(PL + Math.sin(a) * r)
    for (let s = 0; s < 3; s++) {
      a += (s % 2 ? -0.45 : 0.4); r += 2.2
      const qx = Math.round(PL + Math.cos(a) * r), qy = Math.round(PL + Math.sin(a) * r)
      c.line(px, py, qx, qy, s < 2 ? "w" : "y"); px = qx; py = qy
    }
  }
  for (let i = 0; i < 5; i++) {                                                   // sparks off the skin: a kinked jump, hopping each frame
    const a = k * 1.5 + i * 1.257 + (c.frame % 2) * 0.6, at = (aa, r) => [Math.round(PL + Math.cos(aa) * r), Math.round(PL + Math.sin(aa) * r)]
    if (!((i + c.frame) % 3)) continue
    const [x0, y0] = at(a, PR + 0.5), [x1, y1] = at(a + 0.15, PR + 2.5), [x2, y2] = at(a - 0.04, PR + 4.5)
    c.line(x0, y0, x1, y1, "y"); c.line(x1, y1, x2, y2, "w")
  }
  c.px(11, 10, "w"); c.px(12, 10, "w"); c.px(11, 11, "w"); c.px(13, 9, "l")       // the glint on the shell
},
  glow("wy", { r: 3, strength: 0.6, bands: 2 }))

// Penghakiman Langit's mark, sized for r 22 (scaled to r in game): one pass over the warning. A dark scorch swells, a
// violet rune circle turns with its ticks closing in, and a lightning glyph in the middle charges up white.
anim("fu_skyWarn", { w: 47, h: 47, fps: 10, frames: 8 }, (c) => {
  const f = c.frame, C = 23, rot = f * 0.12, hot = f >= 6
  c.circ(C, C, Math.round(6 + f * 1.6), "#1d1a2f50"); c.circ(C, C, Math.round(3 + f), "#1d1a2f80")   // see-through ink (k)
  c.ring(C, C, 22, hot ? "l" : "v"); c.ring(C, C, 21, hot ? "w" : "V"); c.ring(C, C, 17, f % 2 ? "v" : "V")
  for (let i = 0; i < 8; i++) {                                                   // rune ticks between the rings
    const a = rot + i * Math.PI / 4, x0 = Math.round(C + Math.cos(a) * 17), y0 = Math.round(C + Math.sin(a) * 17)
    const x1 = Math.round(C + Math.cos(a) * 21), y1 = Math.round(C + Math.sin(a) * 21)
    c.line(x0, y0, x1, y1, i % 2 ? "v" : "l")
  }
  const m = 15 - f * 1.4                                                          // four marks closing in
  for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
    const x = Math.round(C + dx * m), y = Math.round(C + dy * m)
    c.line(x - dy * 2, y - dx * 2, x + dx * 2, y + dy * 2, "y"); c.line(x + dy * 2, y + dx * 2, x + dx * 2, y + dy * 2, "y")
  }
  const g = f < 3 ? "V" : f < 6 ? "Y" : "w"                                       // the glyph charging up
  c.poly([C + 1, C - 7, C - 3, C + 1, C, C + 1, C - 2, C + 7, C + 4, C - 1, C + 1, C - 1, C + 3, C - 7], g)
},
  glow("wy", { r: 2, strength: 0.5, bands: 2 }))

// Where a pillar lands, 49x33: a white flash on the ground, then a ring of light skidding out over it (seen from above,
// so flattened), sparks thrown along the ground, and a scorched crater fading away.
anim("fu_pillarHit", { w: 49, h: 33, fps: 18, loop: false, frames: 7 }, (c) => {
  const f = c.frame, C = 24, CY = 20
  c.ellipse(C, CY, 9 - (f >> 1), 3, f < 5 ? "#1d1a2fa0" : "#1d1a2f60")      // the scorch
  if (f < 3) { c.ellipse(C, CY, 12 - f * 2, 6 - f, "y"); c.ellipse(C, CY, 10 - f * 2, 5 - f, "w") }
  if (f >= 1) { const rx = 6 + f * 3, ry = 2 + f; c.ellipse(C, CY, rx, ry, f < 4 ? "w" : "l", true); c.ellipse(C, CY, rx - 1, ry - 1, f < 4 ? "l" : "v", true); if (f < 5) c.ellipse(C, CY, rx + 1, ry + 1, "v", true) }
  for (let i = 0; i < 10; i++) {                                                  // sparks skidding out, kinked
    const a = i * 0.628 + 0.3, r0 = 4 + f * 3, r1 = r0 + 4 - (f >> 1)
    if (f >= 6 || r1 <= r0) continue
    const x0 = Math.round(C + Math.cos(a) * r0), y0 = Math.round(CY + Math.sin(a) * r0 * 0.45 - (f < 3 ? 6 - 2 * f : 0) * Math.abs(Math.sin(a * 3)))
    const x1 = Math.round(C + Math.cos(a) * r1), y1 = Math.round(CY + Math.sin(a) * r1 * 0.45)
    c.line(x0, y0, x1, y1, f < 2 ? "w" : "y"); c.px(x1, y1, i % 2 ? "v" : "w")
  }
  if (f < 3) for (const [x, y] of [[C - 3, CY - 12], [C + 2, CY - 16], [C - 1, CY - 20], [C + 4, CY - 8]]) c.px(x, y - f * 3, "w")   // debris kicked up
  if (f >= 5) c.dither(0, 0, 49, 33, ".", "_", f === 5 ? 0.3 : 0.6)
},
  glow("wyl", { r: 3, strength: 0.6, bands: 2 }))

// Pusaran Kristal, 31x31 + ink outline: an ice pinwheel. Three curved blades sweep back from a gem hub, each with a white
// leading edge, pale ice body and a cyan-to-blue trailing side; it spins clockwise (a third of a turn per loop).
const IB = { C: 15, hub: 4, R: 14.5, bend: 1.15, w: 4.4 }
anim("fu_iceBlade", { w: 31, h: 31, fps: 18, frames: 6, outline: "k" }, (c) => {
  const C = IB.C, spin = c.phase * Math.PI * 2 / 3
  for (let i = 0; i < 3; i++) {
    const a0 = spin + i * Math.PI * 2 / 3, lead = [], trail = []
    for (let s = 0; s <= 6; s++) {                                                // a curved, tapering blade: the leading edge ahead, the trailing one swept back
      const t = s / 6, r = IB.hub + (IB.R - IB.hub) * t, a = a0 - IB.bend * t * t, w = IB.w * (1 - t) ** 0.8 / r
      lead.push(Math.round(C + Math.cos(a + w) * r), Math.round(C + Math.sin(a + w) * r))
      trail.unshift(Math.round(C + Math.cos(a - w * 1.6) * r), Math.round(C + Math.sin(a - w * 1.6) * r))
    }
    const pts = [...lead, ...trail]
    c.poly(pts, "C")
    for (let s = 0; s < 6; s++) {                                                 // the body, then the bright leading edge on top
      const t = (s + 0.5) / 6, r = IB.hub + (IB.R - IB.hub) * t, a = a0 - IB.bend * t * t
      c.px(Math.round(C + Math.cos(a) * r), Math.round(C + Math.sin(a) * r), "c")
    }
    for (let j = 0; j + 3 < lead.length; j += 2) c.line(lead[j], lead[j + 1], lead[j + 2], lead[j + 3], "w")
    for (let j = 0; j + 3 < trail.length; j += 2) c.line(trail[j], trail[j + 1], trail[j + 2], trail[j + 3], j < 6 ? "B" : "C")
  }
  c.circ(C, C, IB.hub, "B"); c.circ(C, C, IB.hub - 1, "C"); c.circ(C - 1, C - 1, 1, "c"); c.px(C - 1, C - 1, "w")   // the gem hub
},
  glow("w", { r: 2, strength: 0.4, bands: 2 }))

// Medan Statis: the aura's field, sized for r 56 (scaled to r in game): see-through electric blue deepening to a bright rim
// on an ink line (it must read over a mint crowd), static filaments flickering inside it (re-laid every frame) and white
// sparks crawling along the rim.
const SF = { C: 57, R: 56 }
anim("fu_staticField", { w: 115, h: 115, fps: 12, frames: 4 }, (c) => {
  const { C, R } = SF, f = c.frame
  c.circ(C, C, R, "#7cf0ff48")                                                    // see-through glow (palette e; pxl replaces, never blends)
  c.ring(C, C, R - 4, "#2b3486a0"); c.ring(C, C, R - 2, "#3ccfe0a0"); c.ring(C, C, R - 1, "e"); c.ring(C, C, R, "w"); c.ring(C, C, R + 1, "#1d1a2fc0")   // the rim, inside out (palette M, C, e, w, k)
  for (let i = 0; i < 14; i++) {                                                  // filaments: short kinked threads, re-laid each frame
    const a0 = speck(i, f, 7) * Math.PI * 2, r0 = R * (0.25 + 0.68 * speck(f, i, 3))
    let x = C + Math.cos(a0) * r0, y = C + Math.sin(a0) * r0, a = a0 + (speck(i, i, f) - 0.5) * 2.4
    for (let s = 0; s < 3; s++) {
      const nx = x + Math.cos(a) * 5, ny = y + Math.sin(a) * 5
      c.line(Math.round(x), Math.round(y) + 1, Math.round(nx), Math.round(ny) + 1, "#2b3486c0")   // a navy underside
      c.line(Math.round(x), Math.round(y), Math.round(nx), Math.round(ny), s === 1 ? "w" : "e")
      x = nx; y = ny; a += s % 2 ? 0.9 : -0.9
    }
  }
  for (let i = 0; i < 8; i++) {                                                   // sparks crawling round the rim
    const a = i * 0.785 + f * 0.2, x = Math.round(C + Math.cos(a) * R), y = Math.round(C + Math.sin(a) * R)
    c.rect(x - 1, y - 1, 3, 3, "w"); c.px(x - 2, y, "e"); c.px(x + 2, y, "e"); c.px(x, y - 2, "e"); c.px(x, y + 2, "e")
  }
})

// A node of the aura, 21x21 (a few ride round the rim): a white-hot spark in an ink-rimmed cyan and blue shell, four
// kinked prongs of static jumping off it (each with an ink underside, so it reads over the crowd), turned every frame.
anim("fu_staticNode", { w: 21, h: 21, fps: 14, frames: 6 }, (c) => {
  const C = 10, f = c.frame, at = (a, r) => [Math.round(C + Math.cos(a) * r), Math.round(C + Math.sin(a) * r)]
  for (const [dy, hot, cool] of [[1, "k", "k"], [0, "w", "e"]]) for (let i = 0; i < 4; i++) {
    const a = f * 0.75 + i * Math.PI / 2 + (i % 2) * 0.35, [x0, y0] = at(a, 4), [x1, y1] = at(a + 0.4, 7), [x2, y2] = at(a - 0.15, 10)
    c.line(x0, y0 + dy, x1, y1 + dy, cool); c.line(x1, y1 + dy, x2, y2 + dy, hot)
  }
  c.circ(C, C, 5, "k"); c.circ(C, C, 4, "M"); c.circ(C, C, 3, "C"); c.circ(C - 1, C - 1, 2, "e"); c.circ(C - 1, C - 1, 1, "w"); c.px(C + 1, C - 2, "w")
},
  glow("w", { r: 2, strength: 0.5, bands: 2 }))

// Benteng Es: one block of the ice wall, 11x17 + ink outline (a ring of them turns round the mage): a pointed prism of
// glacier ice, lit left face, cyan right face, a white ridge, a navy foot frosted white; a glint runs up the ridge.
anim("fu_iceWall", { w: 11, h: 17, fps: 8, frames: 4, outline: "k" }, (c) => {
  c.poly([0, 15, 1, 6, 5, 0, 9, 5, 10, 15], "C")                                 // the prism
  c.poly([0, 15, 1, 6, 5, 0, 5, 15], "c")                                         // lit left face
  c.poly([7, 15, 9, 5, 10, 15], "B")                                              // the far side in shade
  c.line(5, 1, 5, 14, "w"); c.line(1, 7, 4, 2, "w")                               // ridge, lit edge
  c.line(2, 10, 3, 12, "C"); c.line(7, 8, 8, 11, "c")                             // cracks in the ice
  c.hline(0, 16, 11, "M"); c.hline(0, 15, 11, "B"); c.px(2, 15, "w"); c.px(6, 15, "c"); c.px(9, 16, "B")   // the foot, frosted
  const g = 12 - c.frame * 3                                                      // the glint climbing the ridge
  c.px(5, g, "w"); c.px(4, g, "w"); c.px(6, g + 1, "c"); if (g > 2) c.px(5, g - 1, "w")
},
  glow("w", { r: 1, strength: 0.35, bands: 1 }))

// Badai Petir's storm core, 19x19 + ink outline (the orbs, consumed, circling the mage): a ball of storm cloud whirling
// round a white-hot eye, its bands turning, lightning cracking across it and forking off its skin.
const STC = 9
anim("fu_stormCore", { w: 19, h: 19, fps: 12, frames: 6, outline: "k" }, (c) => {
  const k = c.phase * Math.PI * 2, f = c.frame
  for (let y = 0; y < 19; y++) for (let x = 0; x < 19; x++) {
    const dx = x - STC, dy = y - STC, d = Math.hypot(dx, dy)
    if (d > 8.4) continue
    const band = Math.sin(Math.atan2(dy, dx) * 2 - d * 0.8 + k)                    // cloud bands spiralling into the eye
    c.px(x, y, d < 2 ? "w" : d < 3.2 ? "y" : d > 7.6 ? "P" : dx + dy < -6 ? (band > 0 ? "l" : "v") : band > 0.35 ? "v" : band > -0.4 ? "V" : "P")
  }
  const BOLTS = [[[-6, -3], [-2, -1], [-1, 2], [4, 1]], [[5, -5], [2, -1], [3, 2], [-1, 6]], [[-5, 4], [-1, 1], [2, 2], [6, -2]]]
  const b = BOLTS[f % 3]                                                          // a crack of lightning across it, a new one each frame
  for (let i = 0; i + 1 < b.length; i++) c.line(STC + b[i][0], STC + b[i][1], STC + b[i + 1][0], STC + b[i + 1][1], i === 1 ? "w" : "Y")
  const a = k + f * 1.3, x0 = Math.round(STC + Math.cos(a) * 8), y0 = Math.round(STC + Math.sin(a) * 8)   // a fork jumping off the skin
  c.line(x0, y0, Math.round(STC + Math.cos(a + 0.2) * 9.4), Math.round(STC + Math.sin(a + 0.2) * 9.4), "y")
  c.px(STC - 1, STC - 1, "w")
},
  glow("wyY", { r: 2, strength: 0.55, bands: 2 }))

sheet("fx", ["fireball*", "fx_*", "iceShard*", "arcaneOrb", "meteor*", "stormCloud", "roots_*", "fu_*"])
