include("palette.px.js")

// Mage, facing right (the game flips for left). Light from the top-left.
// Built from pieces so frames can bob the upper body, squash the robe and swing feet/hem.
// Columns: body 0-11, gap 12 (becomes outline), staff 13, orb 12-14.
const HEAD = `
.bB............
..bBM..........
..bBBM......y..
..bBBBM....ywY.
.bbBBBBM....Y..
.YYYYYYYY....n.
bbBBBBBBBBMM.n.
..nnMHHHHH...n.
..nnhhhhkh...n.
..NnhhhhkhH..n.
...Nhhhihhh..n.`

const ROBE = [
  "...bBBBBBBM..n.", // shoulders
  "..bBBBbbbbBBhn.", // sleeve reaching for the staff
  "..bBBBMMMMMM.n.", // shadow under the sleeve (dropped when squashed)
  ".bbBBBBBBBBM.n.",
  ".YYYYYYYYYYY.n.", // hem trim
]
const HEM = { back: "YYYYYYYYYYYY.n.", fwd: ".YYYYYYYYYYYYn." }

const FEET = {
  stand: "..NN...NN....n.",
  a: ".NN......nn..n.",          // stride, near foot forward
  b: ".nn......NN..n.",          // stride, other foot forward
  pass: "....NNn......n.\n.....nn......n.",
}

// dy: 0 = raised (walk passing pose), 1 = rest, 2 = squash (idle breath)
function mage(c, dy, feet, hem) {
  const top = 12 + (dy === 0 ? -1 : 0) + (dy === 2 ? 1 : 0)
  c.grid(0, dy === 0 ? 16 : 17, FEET[feet])
  const rows = dy === 2 ? ROBE.filter((_, i) => i !== 2) : ROBE.slice()
  if (hem) rows[rows.length - 1] = HEM[hem]
  c.grid(0, top, rows.join("\n"))
  c.grid(0, dy, HEAD)
  if (dy === 0) c.grid(1, 0, "__\nbB")   // hat tip lags (stays put) when the body springs up
}
// orb twinkle: a 4-point sparkle around the orb (orb centre is at x12, y3 + dy)
const sparkle = (dy) => (c) => { c.px(12, 1 + dy, "y"); c.px(10, 3 + dy, "y"); c.px(14, 3 + dy, "y") }

const ORB = { where: [10, 0, 5, 7], r: 3, strength: 0.6 }

anim("mage_idle", { w: 15, h: 18, fps: 4, outline: "k" },
  frame((c) => mage(c, 1, "stand")),
  frame((c) => mage(c, 1, "stand"), sparkle(1)),
  frame((c) => mage(c, 2, "stand")),
  frame((c) => mage(c, 2, "stand"), sparkle(2)),
  glow("wy", ORB))

anim("mage_walk", { w: 15, h: 18, fps: 8, outline: "k" },
  frame((c) => mage(c, 1, "a", "back")),
  frame((c) => mage(c, 0, "pass")),
  frame((c) => mage(c, 1, "b", "fwd")),
  frame((c) => mage(c, 0, "pass")),
  glow("wy", ORB))

sheet("mage", ["mage_*"])
