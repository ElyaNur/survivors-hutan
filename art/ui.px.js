include("palette.px.js")

// UI: pixel font, 16x16 icons, card / panel / slot / bar frames. Light from the top-left.

// ---- Font: pxl's built-in 3x5 font, one sprite per char code, dark outline baked in so text reads
// over the forest. Ink widths below must match src/engine/font.js (a test checks the built sheet).
const NARROW = { ".": 1, "!": 1, ":": 1, "'": 1, "|": 1, ",": 2, ";": 2, "(": 2, ")": 2, "[": 2, "]": 2, "`": 2, "~": 4 }
// Glyphs the built-in font lacks (it falls back to "?"), plus the star and arrow the cards use.
const EXTRA = {
  "[": "##\n#.\n#.\n#.\n##", "]": "##\n.#\n.#\n.#\n##", "\\": "#..\n#..\n.#.\n..#\n..#",
  "^": ".#.\n#.#\n...\n...\n...", "`": "#.\n.#\n..\n..\n..", "|": "#\n#\n#\n#\n#",
  "{": ".##\n.#.\n#..\n.#.\n.##", "}": "##.\n.#.\n..#\n.#.\n##.", "~": "....\n.#.#\n#.#.\n....\n....",
  "★": "..#..\n#####\n.###.\n.#.#.\n#...#",     // star
  "→": "..#..\n...#.\n#####\n...#.\n..#..",     // right arrow
}
const COLORS = { y: "Y", r: "r", g: "g", x: "x", c: "c" }   // variant suffix -> ink key (base is white)
const chars = []
for (let c = 32; c <= 126; c++) chars.push(String.fromCharCode(c))
chars.push("★", "→")
for (const ch of chars) {
  const code = ch.codePointAt(0), name = "glyph_" + code
  if (EXTRA[ch]) sprite(name, { outline: "k" }, EXTRA[ch].replace(/#/g, "w"))
  else sprite(name, { w: NARROW[ch] ?? 3, h: 5, outline: "k" }, text(0, 0, ch, "w"))
  for (const [suffix, key] of Object.entries(COLORS)) sprite(name + "_" + suffix, { base: name, swap: { w: key } })
}

// ---- Icons: 14x14 + outline = 16x16. Each skill wears its spell's colour family.
const icon = (id, draw) => sprite("icon_" + id, { w: 14, h: 14, outline: "k" }, draw)

// Ball with highlight up-left; used by fireball, meteor, orbs.
function ball(c, x, y, r, [rim, body, lit, hot]) {
  c.circ(x, y, r, rim); c.circ(x - 1, y - 1, r - 1, body)
  if (r >= 3) c.circ(x - 1, y - 1, r - 2, lit)
  if (hot) { c.px(x - 2, y - 2, hot); if (r >= 4) c.px(x - 1, y - 2, hot) }
}
// Flame trail running up-right from (x, y): tapering tongues.
function trail(c, x, y, len, keys) {
  for (let i = 0; i < len; i++) {
    const w = Math.max(1, Math.round((len - i) / len * 3.5))
    c.line(x + i, y - i, x + i + 1, y - i - 1, keys[Math.min(keys.length - 1, Math.floor(i / len * keys.length))], w)
  }
}

icon("fireball", (c) => {
  trail(c, 6, 7, 7, ["o", "O", "O", "R"])
  c.px(12, 4, "o"); c.px(9, 1, "O"); c.px(13, 1, "R")             // flying sparks
  ball(c, 5, 8, 5, ["O", "o", "Y", "w"])
  c.px(3, 6, "y"); c.px(4, 6, "y"); c.px(3, 7, "y")
})

icon("meteor", (c) => {
  trail(c, 7, 6, 7, ["Y", "o", "O", "R"])
  c.px(13, 3, "O"); c.px(10, 0, "o")
  c.circ(5, 9, 5, "O")                                             // heat rim on the leading edge
  c.circ(6, 8, 4, "X"); c.circ(5, 7, 3, "x")                       // stone
  c.px(4, 6, "w")
  c.px(6, 9, "X"); c.px(7, 10, "X"); c.px(3, 9, "X")               // craters
  c.px(2, 12, "Y"); c.px(1, 10, "Y"); c.px(4, 13, "o")
})

icon("iceShard", (c) => {
  c.poly([1, 13, 4, 7, 11, 0, 14, 0, 14, 3, 7, 10], "C")           // long shard, point down-left
  c.poly([1, 13, 4, 7, 11, 0, 13, 0, 5, 9], "c")                   // lit upper facet
  c.line(3, 11, 12, 2, "w")
  c.px(13, 0, "w")
  c.poly([0, 6, 3, 4, 5, 4, 2, 7], "c"); c.px(1, 6, "w")             // small chip
  c.px(10, 10, "c"); c.px(12, 8, "w")
})

icon("frostNova", (c) => {                                         // starburst of frost
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, r = i % 2 ? 4.6 : 6.4
    c.line(7, 7, Math.round(7 + r * Math.cos(a)), Math.round(7 + r * Math.sin(a)), i % 2 ? "C" : "c")
  }
  c.circ(7, 7, 3, "C"); c.circ(6, 6, 2, "c"); c.px(6, 6, "w"); c.px(5, 5, "w"); c.px(7, 7, "w")
  c.px(7, 0, "w"); c.px(0, 7, "w"); c.px(2, 2, "w")
})

icon("chainLightning", (c) => {
  c.poly([9, 0, 3, 7, 7, 7, 4, 14, 12, 5, 8, 5, 12, 0], "Y")
  c.poly([9, 0, 3, 7, 5, 7, 10, 1], "y")                           // lit left edge
  c.line(8, 1, 5, 6, "w"); c.line(7, 8, 5, 12, "w")
  c.px(1, 2, "l"); c.px(2, 3, "v"); c.px(12, 9, "l"); c.px(13, 10, "v"); c.px(1, 11, "v")   // violet sparks
})

icon("arcaneOrb", (c) => {
  c.ellipse(7, 8, 6, 3, "d", true)                                 // orbit (back half gets covered)
  ball(c, 7, 7, 4, ["d", "m", "i", "w"])
  for (let a = 0; a < Math.PI; a += 0.05) c.px(Math.round(7 + 6 * Math.cos(a)), Math.round(8 + 3 * Math.sin(a)), "v")   // front half
  for (const [x, y] of [[1, 8], [13, 8], [10, 11]]) { c.px(x, y, "l"); }
  c.px(1, 7, "w"); c.px(13, 9, "v"); c.px(4, 11, "v")
})

// Ultimates: a gold-framed badge (grander than the skills) with the spell scene inside.
function badge(c, top, bottom) {
  c.rect(0, 0, 14, 14, "Y"); c.px(0, 0, "_"); c.px(13, 0, "_"); c.px(0, 13, "_"); c.px(13, 13, "_")
  c.hline(1, 13, 12, "o"); c.vline(13, 1, 12, "o")                 // shaded gold bottom/right
  c.grad(1, 1, 12, 12, top + bottom, "v", 0.5)
  c.px(1, 1, "y")
}
icon("armageddon", (c) => {
  badge(c, "K", "R")
  for (const [x, y, r] of [[10, 3, 1], [11, 9, 1], [5, 7, 2]]) {   // meteor shower, big one in front
    c.line(x + 1, y - 1, x + 2 + r * 2, y - 2 - r * 2, r > 1 ? "o" : "O", r)
    ball(c, x, y, r + 1, ["O", "Y", "y", "w"])
  }
  c.poly([1, 13, 1, 11, 4, 12, 8, 10, 13, 12, 13, 13], "k")        // burning ground
  c.px(4, 11, "O"); c.px(9, 10, "o"); c.px(12, 11, "O")
})
icon("absoluteZero", (c) => {
  badge(c, "M", "B")
  c.hline(2, 7, 10, "c"); c.vline(7, 2, 10, "c")
  c.line(3, 3, 11, 11, "c"); c.line(11, 3, 3, 11, "c")
  for (const [x, y] of [[6, 3], [8, 3], [6, 11], [8, 11], [3, 6], [3, 8], [11, 6], [11, 8]]) c.px(x, y, "s")
  c.circ(7, 7, 1, "w"); c.px(2, 2, "w"); c.px(12, 12, "s")
})
icon("badaiPetir", (c) => {
  badge(c, "P", "V")
  c.circ(4, 4, 2, "l"); c.circ(8, 3, 3, "l"); c.circ(11, 5, 2, "x"); c.hline(2, 6, 11, "x")   // storm cloud
  c.px(6, 1, "w"); c.px(3, 3, "w")
  c.poly([9, 6, 4, 10, 7, 10, 4, 14, 11, 8, 8, 8, 11, 6], "Y"); c.line(8, 7, 6, 9, "w"); c.px(6, 12, "y")
  c.px(2, 10, "m"); c.px(12, 11, "m")
})

// Passives.
icon("vitality", (c) => {
  c.circ(4, 5, 3, "r"); c.circ(9, 5, 3, "r")
  c.poly([1, 6, 13, 6, 7, 13], "r")
  c.poly([7, 13, 13, 6, 13, 7, 9, 12], "R"); c.px(11, 3, "R"); c.px(12, 4, "R")
  c.px(3, 3, "i"); c.px(4, 3, "i"); c.px(2, 4, "i"); c.px(3, 4, "w")
})
icon("swiftness", (c) => {
  c.rect(5, 1, 4, 8, "n"); c.rect(5, 8, 8, 4, "n"); c.px(12, 8, "_")   // boot
  c.vline(8, 1, 7, "N"); c.hline(5, 11, 8, "N"); c.hline(4, 12, 10, "N")
  c.vline(5, 1, 8, "u"); c.hline(5, 1, 4, "u")
  c.hline(4, 3, 6, "Y")                                             // gold cuff
  c.poly([4, 4, 0, 1, 0, 3, 4, 6], "w"); c.poly([4, 7, 1, 5, 0, 7, 4, 9], "s")   // wing on the heel
  c.px(0, 1, "s")
})
icon("focus", (c) => {
  c.hline(2, 0, 10, "n"); c.hline(2, 13, 10, "n"); c.hline(2, 1, 10, "N"); c.hline(2, 12, 10, "N")
  c.poly([3, 2, 11, 2, 8, 7, 11, 12, 3, 12, 6, 7], "s")             // glass
  c.poly([4, 3, 10, 3, 7, 6], "Y"); c.poly([4, 12, 10, 12, 7, 9], "Y")   // sand
  c.vline(7, 6, 5, "y"); c.px(4, 11, "o"); c.px(9, 11, "o")
  c.px(4, 4, "w"); c.px(5, 5, "w")
})
icon("magnet", (c) => {
  c.circ(7, 6, 6, "r"); c.circ(7, 6, 2, "_"); c.rect(5, 6, 5, 8, "_")
  c.rect(1, 6, 4, 4, "r"); c.rect(10, 6, 4, 4, "r")
  c.rect(1, 10, 4, 3, "x"); c.rect(10, 10, 4, 3, "x"); c.px(1, 10, "w"); c.px(10, 10, "w")   // silver tips
  c.vline(4, 6, 4, "R"); c.vline(13, 6, 4, "R"); c.px(11, 3, "R"); c.px(12, 4, "R")
  c.px(3, 2, "i"); c.px(4, 1, "i")
})
icon("wisdom", (c) => {
  c.poly([0, 3, 7, 5, 7, 13, 0, 11], "B"); c.poly([14, 3, 7, 5, 7, 13, 14, 11], "M")   // cover
  c.poly([1, 2, 6, 3, 6, 11, 1, 10], "w"); c.poly([13, 2, 8, 3, 8, 11, 13, 10], "x")   // pages
  c.vline(7, 4, 9, "N")
  for (const y of [5, 7]) { c.hline(2, y, 3, "s"); c.hline(9, y, 3, "X") }
  c.px(3, 0, "Y"); c.px(4, 1, "Y"); c.px(2, 1, "y")                 // spark of insight
})
icon("amplify", (c) => {
  c.ring(7, 7, 6, "G"); c.ring(7, 7, 4, "g"); c.circ(7, 7, 1, "j")
  c.px(6, 6, "w")
  for (const [x, y] of [[2, 3], [3, 2], [4, 4]]) c.px(x, y, "j")
  c.px(0, 7, "j"); c.px(14 - 1, 7, "G"); c.px(7, 0, "j"); c.px(7, 13, "G")
})
icon("heal", (c) => {                                               // level-up "isi HP" card
  c.rect(5, 0, 4, 2, "n"); c.rect(5, 2, 4, 3, "x")                 // cork, neck
  c.circ(7, 9, 5, "x"); c.circ(7, 9, 4, "r"); c.rect(3, 6, 9, 2, "x")
  c.circ(7, 10, 3, "r"); c.px(10, 11, "R"); c.px(9, 12, "R"); c.px(11, 9, "R")
  c.px(4, 8, "w"); c.px(4, 9, "i"); c.px(6, 3, "w")
})

// Grey "not yet" versions (recipe panel: locked ults, missing ingredients).
const GREY = {}
for (const k of "FfGMBNRPVODTEdKXnrAGbvmCoqHUZ") GREY[k] = "X"
for (const k of "gjsupilYywceahtx") GREY[k] = "x"
for (const id of ["fireball", "meteor", "iceShard", "frostNova", "chainLightning", "arcaneOrb", "armageddon", "absoluteZero", "badaiPetir"])
  sprite("icon_" + id + "_off", { base: "icon_" + id, swap: GREY })

// Kill counter skull, 7x6 + outline.
sprite("icon_kill", { outline: "k" }, `
.xwwwx.
xwwwwwx
wkkwkkw
wkkwkkw
.wwkww.
.x.x.x.`)

// ---- Frames (drawn 9-slice by the game; centre and edges are flat so they stretch cleanly).
// ring(d) picks a key by the distance d from the edge and which side (top-left lit, bottom-right shaded).
function frame(name, size, rings, body, corner) {
  sprite(name, { w: size, h: size }, (c) => {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const d = Math.min(x, y, size - 1 - x, size - 1 - y)
      const lit = x + y < size - 1
      const r = rings[d]
      c.px(x, y, r ? (Array.isArray(r) ? r[lit ? 0 : 1] : r) : body)
    }
    for (const [x, y] of [[0, 0], [size - 1, 0], [0, size - 1], [size - 1, size - 1]]) c.px(x, y, "_")   // round corners
    if (corner) corner(c, size)
  })
}
const studs = (lit, mid, dark) => (c, s) => {
  for (const [x, y] of [[2, 2], [s - 3, 2], [2, s - 3], [s - 3, s - 3]]) {
    c.px(x, y, mid); c.px(x - 1, y, lit); c.px(x, y - 1, lit); c.px(x + 1, y, dark); c.px(x, y + 1, dark)
  }
}
frame("card", 16, ["k", ["l", "V"], ["Z", "P"], "k"], "U", studs("y", "Y", "o"))
frame("card_sel", 16, ["k", ["w", "o"], ["Y", "O"], "k"], "U", studs("w", "y", "Y"))
frame("panel", 8, ["k", ["Z", "P"], "k"], "#2a2346d9")
frame("slot", 18, ["k", ["P", "Z"]], "k")
frame("slot_lit", 18, ["k", ["y", "o"]], "k")
frame("bar", 8, ["k", ["Z", "P"]], "k")
// Ult unlock banner (9-slice, 8 px edges): ink outline, a gold bevel over a crimson band, a ruby set in each corner.
frame("ult_banner", 24, ["k", ["y", "O"], ["Y", "R"], "k", ["K", "K"]], "#1d1a2fe6", (c, s) => {
  for (const [x, y] of [[4, 4], [s - 5, 4], [4, s - 5], [s - 5, s - 5]]) {
    c.px(x, y - 1, "k"); c.px(x - 1, y, "k"); c.px(x + 1, y, "k"); c.px(x, y + 1, "k")   // diamond setting
    c.px(x, y, "r"); c.px(x, y - 1, "i")
  }
})

sheet("ui", ["glyph_*", "icon_*", "card*", "panel", "slot*", "bar", "ult_*"])
