include("palette.px.js")

// Hutan Cerah world art. Light from the top-left (same as the mage).
// Props (trees, bushes, hut) stand on the bottom row of their canvas: the game anchors them there.

// Canopy = overlapping leaf clumps, back (top) clumps first so each front clump's dark rim reads as
// the shade under the clump above it. Each clump: dark rim, mid body nudged up-left, lit crown,
// one glint on the big ones.
function canopy(c, blobs, [dark, mid, light, sun, glint]) {
  for (const [x, y, r] of [...blobs].sort((a, b) => a[1] - b[1])) {
    c.circ(x, y, r, dark)
    c.circ(x - 1, y - 1, r - 1, mid)
    if (r >= 4) c.circ(x - 2, y - 2, r - 3, light)
    if (r >= 6) c.circ(x - 3, y - 3, r - 5, sun)
    if (r >= 5) { c.px(x - 3, y - 4, glint); c.px(x - 4, y - 3, glint) }
  }
}
const LEAF = ["F", "f", "G", "g", "j"]
function trunk(c, x, top, bot) {
  c.rect(x, top, 4, bot - top + 1, "n"); c.vline(x + 3, top, bot - top + 1, "N")
  c.hline(x, top, 4, "N")                                  // canopy shadow on the trunk
  c.px(x - 1, bot, "n"); c.px(x + 4, bot, "N")             // root flare
}

// Round oak: full, wide canopy.
sprite("tree_1", { w: 24, h: 30, outline: "k" }, (c) => {
  trunk(c, 10, 20, 29)
  canopy(c, [[12, 11, 8], [6, 16, 5], [18, 16, 5], [12, 18, 5], [8, 8, 5], [16, 8, 5]], LEAF)
})

// Pine: three tiers that flare at the hem (stepped silhouette). Back to front, so each tier's hem
// overlaps the one below and leaves a shade line on it. Lit left flank, shaded right flank.
sprite("tree_2", { w: 22, h: 30, outline: "k" }, (c) => {
  trunk(c, 9, 24, 29)
  for (const [t, b, hw] of [[13, 25, 10], [6, 18, 8], [0, 11, 5]]) {
    for (let y = t; y <= b; y++) {
      const w = Math.max(1, Math.round(hw * ((y - t + 1) / (b - t + 1)) ** 1.5))
      c.hline(11 - w, y, w * 2, "f")
      c.hline(11 - w, y, Math.ceil(w * 0.6), "G")
      c.hline(11 + Math.floor(w * 0.4), y, w - Math.floor(w * 0.4), "F")
    }
    c.px(11 - hw, b, "g"); c.px(10 - Math.round(hw * 0.5), b - 2, "g")   // sun on the needle tips
    if (b < 25) c.hline(12 - hw, b + 1, hw * 2 - 2, "F")      // hem shade on the tier below
  }
})

// Apple tree: smaller, rounder, with fruit.
sprite("tree_3", { w: 20, h: 26, outline: "k" }, (c) => {
  trunk(c, 8, 17, 25)
  canopy(c, [[10, 8, 6], [5, 13, 4], [15, 12, 4], [10, 14, 5]], LEAF)
  for (const [x, y] of [[6, 12], [13, 9], [15, 15], [9, 16]]) { c.px(x, y, "r"); c.px(x + 1, y, "R"); c.px(x, y - 1, "i") }
})

sprite("bush_1", { w: 16, h: 11, outline: "k" }, (c) =>
  canopy(c, [[7, 5, 5], [4, 7, 4], [11, 7, 4]], LEAF))
sprite("bush_2", { w: 16, h: 11, outline: "k" }, (c) => {
  canopy(c, [[8, 5, 5], [4, 7, 4], [12, 7, 4]], LEAF)
  for (const [x, y] of [[4, 5], [9, 3], [11, 7], [6, 8]]) { c.px(x, y, "i"); c.px(x + 1, y, "r") }   // berries
})

sprite("rock_1", { w: 9, h: 6, outline: "k" }, (c) => {
  c.ellipse(4, 3, 4, 3, "X"); c.ellipse(3, 2, 3, 2, "x"); c.hline(1, 5, 7, "X")
  c.px(2, 1, "w"); c.hline(3, 0, 3, "G"); c.px(4, 1, "G")  // moss on the sunny top
})
sprite("rock_2", { w: 6, h: 4, outline: "k" }, (c) => {
  c.rect(0, 1, 6, 3, "X"); c.rect(0, 0, 5, 3, "x"); c.px(5, 0, "_"); c.px(1, 0, "w")
})

// Hut: log cabin, red shingle roof, stone chimney (right), lit windows with flower boxes.
// 48x40 (+outline 50x42); the chimney mouth is at (38, 0) before the outline.
function windowAt(c, x, y) {
  c.rect(x, y, 8, 7, "u"); c.rect(x + 1, y + 1, 6, 5, "y")             // frame, warm glass
  c.vline(x + 4, y + 1, 5, "u"); c.hline(x + 1, y + 3, 6, "u")          // muntins
  c.px(x + 1, y + 1, "w"); c.px(x + 5, y + 1, "w")                      // glints
  c.rect(x - 1, y + 7, 10, 2, "N"); c.hline(x - 1, y + 7, 10, "n")      // flower box
  for (let i = 0; i < 4; i++) { c.px(x + i * 2 + 1, y + 6, "G"); c.px(x + i * 2, y + 6, i % 2 ? "i" : "Y") }
}
const ROOF = [9, 3, 39, 3, 48, 20, 0, 20]
sprite("hut", { w: 48, h: 40, outline: "k" }, (c) => {
  // walls: stacked logs, lit from the left, log ends at the corners
  c.rect(4, 20, 40, 17, "n")
  for (let y = 22; y < 37; y += 3) c.hline(4, y, 40, "N")
  for (let y = 22; y < 37; y += 3) { c.px(3, y - 1, "u"); c.px(3, y, "n"); c.px(44, y - 1, "n"); c.px(44, y, "N") }
  c.rect(4, 20, 40, 2, "N")                                             // shade under the eaves
  // stone footing and door step
  c.rect(3, 37, 42, 3, "X"); for (let x = 4; x < 44; x += 5) c.hline(x, 37, 3, "x")
  c.rect(19, 37, 10, 3, "x"); c.hline(19, 39, 10, "X")
  // door
  c.rect(20, 25, 8, 12, "N"); c.rect(21, 26, 6, 11, "n"); c.vline(24, 26, 11, "N")
  c.hline(21, 26, 6, "u"); c.px(26, 31, "Y")
  windowAt(c, 8, 25); windowAt(c, 32, 25)
  // roof: front slope, shingle courses with offset joints
  c.poly(ROOF, "r")
},
  clip(ROOF, (c) => {
    for (let y = 6, row = 0; y <= 20; y += 3, row++) {
      c.hline(0, y, 48, "R")
      for (let x = (row % 2) * 3 + 1; x < 48; x += 6) c.px(x, y - 1, "R")
    }
    c.hline(0, 3, 48, "R"); c.hline(0, 4, 48, "i")                    // ridge cap
    c.hline(0, 19, 48, "R")                                            // eave edge
    c.line(9, 4, 1, 19, "i")                                           // sunlit gable edge
  }),
  // chimney: stone courses, sooty mouth
  (c) => {
    c.rect(33, 0, 7, 10, "x"); c.rect(38, 0, 2, 10, "X")
    for (let y = 3; y < 10; y += 3) c.hline(33, y, 7, "X")
    c.hline(33, 0, 7, "X"); c.hline(34, 0, 4, "k")
  })

// Bridge: vertical planks across the river (you walk left-right over them), low rails on both
// edges. 68x44 (+outline 70x46): deck rows 4..39.
sprite("bridge", { w: 68, h: 44, outline: "k" }, (c) => {
  for (let x = 0; x < 68; x += 4) {
    const jut = (x / 4) % 3 === 1 ? 1 : 0                     // uneven plank ends
    c.rect(x, 4 - jut, 4, 36 + jut * 2, "n")
    c.vline(x, 4 - jut, 36 + jut * 2, "u")                    // lit plank edge
    c.vline(x + 3, 4 - jut, 36 + jut * 2, "N")                // gap
    c.px(x + 1, 8, "N"); c.px(x + 1, 35, "N")                 // nail heads on the joists
  }
  for (const y of [0, 39]) {                                  // rails over the water only; the deck runs on past them
    c.rect(6, y + 1, 56, 3, "N"); c.hline(6, y + 1, 56, "n")
    for (const x of [5, 23, 41, 59]) { c.rect(x, y, 4, 5, "N"); c.hline(x, y, 4, "u"); c.vline(x, y + 1, 3, "n") }
  }
})

// Path from the hut yard to the bridge. World origin (930, 520); see PATH in src/game/world.js.
// Worn sand: the upper edge sits in shade, the lower edge catches light, grass thickens along both.
const PATH_W = 512, PATH_H = 72
const pathMid = (x) => x < 140 ? 54 - 26 * Math.sin(Math.min(1, x / 140) * Math.PI / 2) : 28 + 2 * Math.sin((x - 140) / 47)
const pathHalf = (x) => 7 + Math.round(Math.sin(x / 29) + Math.sin(x / 11) * 0.6)
sprite("path", { w: PATH_W, h: PATH_H }, (c) => {
  c.ellipse(32, 54, 28, 11, "p")                              // trampled yard by the door
  for (let x = 32; x < PATH_W; x++) {
    const m = Math.round(pathMid(x)), h = pathHalf(x)
    c.vline(x, m - h, h * 2 + 1, "p")
  }
  for (let x = 0; x < PATH_W; x++) for (let y = 1; y < PATH_H - 1; y++) {
    if (!c.is(x, y, "p")) continue
    if (c.is(x, y - 1, ".")) { c.px(x, y, "D"); c.px(x, y - 1, "q") }      // shaded upper lip
    else if (c.is(x, y + 1, ".")) c.px(x, y + 1, "q")                       // grass edge below
  }
  const rng = c.rng(3)                                        // a few pebbles kicked to the sides
  for (let x = 6; x < PATH_W; x += 9 + Math.floor(rng() * 14)) {
    const m = Math.round(pathMid(x)), h = pathHalf(x), y = m + (rng() < 0.5 ? -h + 2 : h - 1)
    if (c.is(x, y, "p")) { c.px(x, y, "x"); c.px(x + 1, y, "X") }
  }
})

// River cross-sections, one pixel tall, stacked row by row along riverX(y) by the game.
// 56 wide: grass lip | sand | foam | water (44 px: shallows, deep channel, shallows) | foam | sand | lip.
// Variants nudge the sand line so the banks wander a little.
for (const [n, l, r] of [[1, 3, 3], [2, 4, 3], [3, 3, 4], [4, 2, 3], [5, 3, 2]]) {
  sprite("river_" + n, { w: 56, h: 1 }, (c) => {
    c.hline(6, 0, 44, "b"); c.hline(17, 0, 22, "B")
    c.px(6, 0, "s"); c.px(49, 0, "s")
    c.hline(6 - l, 0, l, "p"); c.hline(50, 0, r, "p")
    c.px(5 - l, 0, "q"); c.px(50 + r, 0, "q")
  })
}
sprite("river_shade", { base: "river_1", swap: { b: "B", B: "M", s: "b" } })   // under the bridge's lee

// Soft ground shade under props (light from the top-left, so it sits a little right).
sprite("shadow_tree", { w: 26, h: 9 }, ellipse(13, 4, 12, 4, "q"), ellipse(14, 4, 8, 2, "G"))
sprite("shadow_bush", { w: 18, h: 6 }, ellipse(9, 3, 8, 2, "q"))
sprite("shadow_hut", { w: 60, h: 12 }, ellipse(30, 6, 29, 5, "q"))

// Small ground things, baked into the ground canvas.
sprite("grass_1", `
  .q.
  qjq
  q.q`)
sprite("grass_2", `
  ..q..
  q.j.q
  qGqGq`)
sprite("grass_3", `
  .j..
  .q.j
  qGqq`)
for (const n of [1, 2, 3]) sprite("tall_" + n, { base: "grass_" + n, swap: { q: "G", j: "g" } })   // tufts in long grass
sprite("daisy", `
  .w.
  wYw
  .w.`)
// Cattails: a clump of stems with brown seed heads, leaves arching out at the base.
sprite("reed", { w: 8, h: 12 }, (c) => {
  for (const [x, top] of [[2, 1], [4, 0], [6, 3]]) {
    c.vline(x, top + 3, 12 - top - 3, "f"); c.vline(x, top + 3, 2, "G")
    c.rect(x, top, 1, 3, "N"); c.px(x, top, "n")              // seed head, lit tip
    c.px(x, top - 1, "f")
  }
  c.line(0, 8, 2, 11, "G"); c.line(7, 8, 5, 11, "f"); c.line(3, 7, 3, 11, "G")
})
sprite("lily", { outline: "F" }, `
  .GGg.
  GGG.g
  fGGGG
  .ffG.`)

// Woodcutter's corner: the hut burns wood, so there is a woodpile and old stumps around it.
const LOG_END = ".nn.\nnuun\nnunn\n.nn."                     // cut log seen end-on, rings
sprite("woodpile", { w: 16, h: 11, outline: "k" }, (c) => {
  c.poly([2, 2, 14, 2, 16, 11, 0, 11], "N")                   // shade between the logs
  for (const [x, y] of [[4, 1], [8, 1], [2, 4], [6, 4], [10, 4], [0, 7], [4, 7], [8, 7], [12, 7]]) c.grid(x, y, LOG_END)
})
const STUMP = `
  ..nnnnnn..
  .nuuuuuun.
  .nuunnuun.
  .nuuuuuun.
  .Nnnnnnnn.
  .nnNnnnNN.
  .nnNnnnNN.
  nnnNnnnNNN`
sprite("stump", { outline: "k" }, STUMP)
sprite("stump_axe", { outline: "k" }, `
  .......n..
  ......n...
  ...xxn....
  ..wxxX....
  ..xxn.....`.replace(/^\s+/gm, "") + "\n" + STUMP.trim().replace(/^\s+/gm, "").split("\n").slice(1).join("\n"))

// Swaying flower clumps (drawn live). Frames: rest, lean right, rest, lean left.
const FLOWER = { 1: ["w", "Y"], 2: ["i", "r"], 3: ["Y", "y"] }
for (const n in FLOWER) {
  const [petal, heart] = FLOWER[n]
  anim("flower_" + n, { w: 9, h: 8, fps: 3, frames: 4 }, (c) => {
    const lean = [0, 1, 0, -1][c.frame]
    for (const [x, top] of [[2, 2], [6, 1], [4, 4]]) {
      c.vline(x, top + 2, 7 - top, "G")
      const hx = x + (top < 3 ? lean : 0)
      c.px(hx - 1, top, petal); c.px(hx + 1, top, petal); c.px(hx, top - 1, petal); c.px(hx, top + 1, petal)
      c.px(hx, top, heart)
    }
    c.px(1, 6, "q"); c.px(7, 6, "q"); c.px(3, 7, "q")          // leaves at the base
  })
}

// River glint: a ripple that opens, glints and closes (drifts downstream in the game).
anim("water_shimmer", { w: 7, h: 2, fps: 8 },
  frame(hline(3, 1, 1, "s")),
  frame(hline(2, 1, 3, "s")),
  frame(hline(1, 1, 5, "s"), px(3, 0, "w")),
  frame(hline(0, 1, 7, "s"), px(3, 1, "w")),
  frame(hline(0, 1, 2, "s"), hline(5, 1, 2, "s")),
  frame({ hold: 3 }))

// Wading ring around legs in the river: foam ring that swells and settles.
anim("water_wade", { w: 21, h: 7, fps: 5 },
  frame(ellipse(10, 3, 8, 2, "s", true), px(5, 2, "w"), px(14, 4, "w")),
  frame(ellipse(10, 3, 9, 2, "s", true), ellipse(10, 3, 6, 1, "b", true), px(4, 2, "w"), px(16, 4, "w")),
  frame(ellipse(10, 3, 10, 3, "s", true), px(3, 3, "w"), px(17, 2, "w")))

// Chimney smoke: four puffs rising, swelling, drifting right with the breeze, then thinning out.
anim("hut_smoke", { w: 16, h: 28, frames: 16, fps: 8 }, (c) => {
  for (let i = 0; i < 4; i++) {
    const p = (c.phase + i / 4) % 1
    const x = Math.round(4 + p * 8 + Math.sin(p * 7) * 1.2), y = Math.round(25 - p * 21)
    const r = p < 0.75 ? Math.round(1.5 + p * 3) : Math.round((1 - p) * 14)
    if (r < 1) continue
    c.circ(x, y, r, "x")
    if (r >= 2) c.circ(x - 1, y - 1, r - 1, "w")              // sunlit side of the puff
  }
})

sheet("world", [
  "tree_*", "bush_*", "rock_*", "hut", "hut_smoke", "bridge", "path", "river_*",
  "shadow_*", "grass_*", "tall_*", "daisy", "woodpile", "stump*", "reed", "lily", "flower_*", "water_shimmer", "water_wade",
])
