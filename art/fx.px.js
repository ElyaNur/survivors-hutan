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
anim("meteor_warn", { w: 59, h: 59, fps: 10, frames: 8 }, (c) => {
  const f = c.frame, C = 29, sr = Math.round(9 + f * 2.4)
  c.circ(C, C, sr, "#1d1a2f50"); c.circ(C, C, Math.round(sr * 0.6), "#1d1a2f80")   // see-through ink (k): any ground shows under it
  const hot = f % 2 === 0
  c.ring(C, C, 28, hot ? "Y" : "O"); c.ring(C, C, 27, hot ? "O" : "R")
  const m = 24 - f * 1.6                                                           // closing marks
  for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
    const x = Math.round(C + dx * m), y = Math.round(C + dy * m)
    c.line(x - dy * 2, y - dx * 2, x + dx * 2, y + dy * 2, "Y"); c.line(x + dy * 2, y + dx * 2, x + dx * 2, y + dy * 2, "Y")
    c.px(x + dx * 2, y + dy * 2, "y")
  }
})

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

sheet("fx", ["fireball*", "fx_*", "iceShard*", "arcaneOrb", "meteor*", "stormCloud", "roots_*"])
