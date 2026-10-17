include("palette.px.js")

// Archmage (owner-approved variant A), facing right; the game flips for left. Light from the top-left.
// Deep purple hood and robe, gold trim, long white beard, tall staff with a cyan crystal.
// Rest pose: TOP at y1, BOT at y14, FEET on the bottom row. Canvas 15x24 (+outline = 17x26).
const TOP = `
............c..
...........cwC.
...vvV.....ccC.
..vvVVV.....C..
.vvVVVVP...YnY.
.vVVPxxXk...n..
.vVPHHkhH...n..
.vVPhhhhhH..n..
.vVPwwwwwH..n..
PvVVwwwwwww.n..
PvvVVwwwwVVhn..
PvvVVYwwwVVVn..
PvvVVYwwwVPPn..`
const BOT = [
  "PvvVVYVwwVPP.n.",
  "PvvVVYVVwVPP.n.",
  "PvvVVVYVVVPP.n.", // dropped when the body breathes in (squash)
  "PvvvVVYVVVPP.n.",
  "PvvvVVVYVVVP.n.",
  "PvvvVVVYVVVP.n.",
  "PvvvVVVYVVVPPn.",
  "PvvvVVVVYVVPPn.",
  "YYYYYYYYYYYYYn.",
]
const HEM = { stir: ".YYYYYYYYYYYYn.", back: "YYYYYYYYYYYY.n.", fwd: ".YYYYYYYYYYYYn." }
const FEET = {
  stand: "..NN....NN...n.",
  a: ".NN.......NN.n.",
  b: "..NN.....NN..n.",
  pass: "....NNN......n.\n.....NN......n.",
}

// bob: 0 rest, 1 breath (top sinks 1px, robe loses a row), -1 raised (walk passing pose)
function mage(c, bob, feet, hem) {
  const f = FEET[feet]
  c.grid(0, 24 - f.split("\n").length, f)
  const rows = BOT.slice()
  if (bob === 1) rows.splice(2, 1)
  if (hem) rows[rows.length - 1] = HEM[hem]
  c.grid(0, 14 + bob, rows.join("\n"))
  c.grid(0, 1 + bob, TOP)
}
// crystal pulse: 4-point sparkle around the crystal (centre x12, y2 + bob)
const pulse = (bob) => (c) => { c.px(12, bob, "e"); c.px(10, 2 + bob, "c"); c.px(14, 2 + bob, "c") }
const CRYSTAL = { where: [9, 0, 6, 6], r: 3, strength: 0.6, bands: 2 }

anim("mage_idle", { w: 15, h: 24, fps: 4, outline: "k" },
  frame((c) => mage(c, 0, "stand")),
  frame((c) => mage(c, 0, "stand", "stir"), pulse(0)),
  frame((c) => mage(c, 1, "stand", "stir")),
  frame((c) => mage(c, 1, "stand"), pulse(1)),
  glow("wce", CRYSTAL))

anim("mage_walk", { w: 15, h: 24, fps: 8, outline: "k" },
  frame((c) => mage(c, 0, "a", "back")),
  frame((c) => mage(c, -1, "pass")),
  frame((c) => mage(c, 0, "b", "fwd")),
  frame((c) => mage(c, -1, "pass")),
  glow("wce", CRYSTAL))

sheet("mage", ["mage_*"])
