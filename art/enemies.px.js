include("palette.px.js")

// Monsters, all facing right (the game flips for left). Light from the top-left, dark "k" outline,
// 2-4 shades per material. Each type owns a colour so it reads in a crowd:
// slime mint, slimeRed red, bat violet, goblin green + leather, wolf grey, orc olive + iron, witch magenta.

// Green slime. Hops: rest, squash (wind-up), stretch (jump), land.
// [rx, h, lift]: half-width, body height, px off the ground.
const HOP = [[6, 10, 0], [7, 8, 0], [5, 12, 2], [6, 10, 1]]

anim("slime_walk", { w: 15, h: 14, fps: 8, outline: "k", frames: HOP.length }, (c) => {
  const [rx, h, lift] = HOP[c.frame]
  const cx = 7, bot = 13 - lift, top = bot - h + 1
  const dome = Math.ceil(h * 0.6)                        // rounded top, straight sides below
  for (let y = top; y <= bot; y++) {
    const t = y - top
    let hw = t < dome ? Math.round(rx * Math.sqrt(1 - ((dome - t - 0.5) / dome) ** 2)) : rx
    if (y === bot) hw = rx - 1                           // soft bottom corners
    if (t === 0) hw = Math.min(hw, rx - 3)                // rounder crown
    hw = Math.max(hw, 1)
    c.hline(cx - hw, y, hw * 2 + 1, "t")
    if (t >= dome - 2) c.px(cx + hw, y, "T")             // right-side shadow
  }
  c.hline(cx - rx + 1, bot, rx * 2 - 1, "T")             // belly shadow
  c.px(cx + rx - 1, bot - 1, "T")
  const hy = top + 2, hx = cx - rx + 2                   // top-left sheen
  c.px(hx, hy, "w"); c.px(hx + 1, hy - 1, "a"); c.px(hx - 1, hy + 1, "a"); c.px(hx, hy + 1, "a")
  const ey = top + Math.round(h * 0.45)                  // eyes look right
  c.vline(cx + 1, ey, 2, "k"); c.vline(cx + 4, ey, 2, "k")
  c.px(cx + 1, ey, "w"); c.px(cx + 4, ey, "w")
  c.px(cx + 5, ey + 2, "a")                              // cheek
})
// Red slime: the same hop, recoloured.
anim("slimeRed_walk", { base: "slime_walk", fps: 8, frames: HOP.length, swap: { t: "r", T: "R", a: "i" } })

// ---- King Slime (mini-boss, 30x30 + outline = 32x32): the green slime grown huge and smug, a gold
// crown with red and blue jewels riding the hop, little bubbles floating inside its jelly.
const KHOP = [[13, 19, 0], [14, 16, 0], [11, 22, 3], [13, 19, 1]]   // [rx, h, lift] like HOP
const crown = (c, x, y) => {                                     // 11x6, top-left at x,y
  c.grid(x, y, `
.Y...Y...Y.
.YY.YyY.YY.
YyYYYYYYYoY
YrYYYbYYrYo
YYYYYYYYYYo
.ooooooooo.`)
  c.px(x + 5, y, "w")                                            // glint on the tall point
}
anim("kingSlime_walk", { w: 30, h: 30, fps: 6, outline: "k", frames: KHOP.length }, (c) => {
  const [rx, h, lift] = KHOP[c.frame]
  const cx = 14, bot = 29 - lift, top = bot - h + 1, dome = Math.ceil(h * 0.62)
  for (let y = top; y <= bot; y++) {
    const t = y - top
    let hw = t < dome ? Math.round(rx * Math.sqrt(1 - ((dome - t - 0.5) / dome) ** 2)) : rx
    if (y === bot) hw = rx - 2
    else if (y === bot - 1) hw = rx - 1                          // soft bottom corners
    if (t === 0) hw = Math.min(hw, rx - 6)                       // rounder crown of the head
    hw = Math.max(hw, 2)
    c.hline(cx - hw, y, hw * 2 + 1, "t")
    if (t >= 2) { c.px(cx + hw, y, "T"); if (t >= dome - 3) c.px(cx + hw - 1, y, "T") }   // right-side shadow, deeper low down
  }
  c.hline(cx - rx + 2, bot, rx * 2 - 3, "T"); c.hline(cx - rx + 4, bot - 1, rx * 2 - 6, "T")   // belly shadow
  const hx = cx - rx + 4, hy = top + 4                             // sheen: a curved streak, top-left
  c.vline(hx - 1, hy + 1, 4, "a"); c.hline(hx, hy - 1, 3, "a"); c.px(hx, hy, "w"); c.px(hx + 1, hy - 1, "w"); c.px(hx, hy + 1, "a")
  const by = top + Math.round(h * 0.75)                           // bubbles drifting inside, rising with the frame
  const rise = c.frame % 2
  c.rect(cx - 7, by - rise, 2, 2, "a"); c.px(cx - 7, by - rise, "w")       // one fat bubble, two small ones
  c.px(cx - 3, by - 4 - rise, "a"); c.px(cx + 4, by + 2 - rise, "a")
  const ey = top + Math.round(h * 0.42)                           // eyes look right: tall, with shine
  for (const ex of [cx + 2, cx + 8]) { c.rect(ex, ey, 2, 3, "k"); c.px(ex, ey, "w") }
  c.hline(cx + 1, ey - 2, 3, "T"); c.hline(cx + 8, ey - 2, 3, "T")   // stern brows
  c.px(cx + 3, ey - 1, "T"); c.px(cx + 8, ey - 1, "T")
  c.hline(cx + 4, ey + 5, 4, "T"); c.px(cx + 8, ey + 4, "T")        // smug little smirk
  c.px(cx + 10, ey + 3, "a"); c.px(cx + 11, ey + 3, "a")           // cheek
  c.hline(cx - 3, top + 2, 9, "T")                                  // the crown's shadow on the jelly
  crown(c, cx - 4, top - 4)
})

// Mirror helper for front-facing sprites: each row is the left half incl. the centre column.
const sym = (rows) => rows.map((r) => r + [...r.slice(0, -1)].reverse().join("")).join("\n")

// Bat, front view: violet body, darker scalloped wings, gold eyes, two little fangs.
// Wings flap up -> mid -> down -> mid. Left halves incl. the centre column (col 8).
const BAT_WINGS = [
  [ "V.....v..",
    "VV....vv.",
    ".VV...vvv",
    ".VVV.vvvv",
    "..VVVvvYv",
    "..PVVVvvv",
    "...PVVvvv",
    "....P.vvv",
    ".......w.",
    "........."],
  [ "......v..",
    "......vv.",
    "......vvv",
    "VVV..vvvv",
    "vVVVVvvYv",
    ".VVVVVvvv",
    ".PVPVVvvv",
    ".P..P.vvv",
    ".......w.",
    "........."],
  [ "......v..",
    "......vv.",
    "......vvv",
    ".....vvvv",
    "...VVvvYv",
    "..VVVVvvv",
    ".vVVVVvvv",
    "vVPVPVvvv",
    "VP.P...w.",
    "P........"],
]
anim("bat_fly", { w: 17, h: 10, fps: 12, outline: "k" },
  ...[0, 1, 2, 1].map((i) => frame(sym(BAT_WINGS[i]), (c) => {
    c.px(6, 2, "l"); c.px(6, 3, "l"); c.px(7, 2, "l")                           // top-left light
    c.vline(10, 5, 3, "V"); c.px(9, 7, "V")                                     // right-side shade
  })))

// Goblin, side view: big bald lime head, one long ear swept back, gold eye, fanged grin,
// leather tunic, a bone knife held up. Hunched and smaller than the mage. Barefoot.
const GOBLIN_TOP = `
......jjjj...
j...jwjjjjjg.
jjj.jjjjjjjjg
.jHjjjjjkkjjg
..jjjjjjjYkjj
...gjjjjjjjjj
...gjjjkwkwk.
....ggggkkg.w
....NunnNN.x.
...NnnnnnNjx.
...NnnnnnNjN.
...NNYNNNN...
....NnnnN....`
const GOBLIN_LEGS = {
  a:    ["....G...g....", "...GG....g...", "..GG.....gg.."],
  pass: [".....Gg......", ".....Gg......", "......g......", ".....ggg....."],
  b:    ["....g...G....", "...gg....G...", "..gg.....GG.."],
}
const goblin = (legs) => (c) => {
  const L = GOBLIN_LEGS[legs], bob = L.length > 3 ? -1 : 0
  c.grid(0, 17 - L.length, L.join("\n"))
  c.grid(0, 1 + bob, GOBLIN_TOP)
}
anim("goblin_walk", { w: 13, h: 17, fps: 8, outline: "k" },
  frame(goblin("a")), frame(goblin("pass")), frame(goblin("b")), frame(goblin("pass")))

// Wolf, side view at a gallop: grey with a dark back stripe, pale chest and muzzle, red eye,
// bushy tail. Far legs dark, near legs light. reach -> mid -> gather -> mid, body rises mid-stride.
const WOLF_BODY = `
............X.X....
...........XxXx....
..........Xxxxxx...
X.........xxxxrxxx.
XX.XXXXXXXxxxxxxxxk
.XXxxxxxxXXxxxxwwk.
..xxxxxxxxxXxxwww..
..xxxxxxxxxxXwww...
...XXXXxxxXXXww....
...XXX.....XXw.....`
const WOLF_LEGS = {
  reach:  ["..XX.......Xww.....", ".XX..........ww....", "XX............ww...", "X..............ww.."],
  mid:    ["...xx.X....Xw.w....", "...x..X....X..w....", "..x...X....X...w...", ".xx..XX...XX...ww.."],
  gather: ["....xX....Xw.......", ".....xX..Xw........", "......xXXw.........", ".....xxXww........."],
}
const wolf = (legs, lift) => (c) => {
  c.grid(0, 11 - lift, WOLF_LEGS[legs].join("\n"))
  c.grid(0, 1 - lift, WOLF_BODY)
}
anim("wolf_run", { w: 19, h: 15, fps: 12, outline: "k" },
  frame(wolf("reach", 1)), frame(wolf("mid", 0)), frame(wolf("gather", 0)), frame(wolf("mid", 0)))

// Orc, 3/4 side view: hulking olive brute in an iron helmet, red eye, tusks, leather strap,
// red loincloth, a big wooden club resting on the back shoulder. Heavy stomp: body sinks on contact.
const ORC_TOP = `
.nn...............
nunN..............
nnnN...XXXX.......
.nNN..XxxxxX......
..NN.XxxxxxXX.....
...N.XXXXXXXX.....
...NNEAArAArAA....
....NAAAAAAAAA....
.....EwkkkkwA.....
...AAAEEEEEEAA....
..AAAAANNAAAAAA...
.AAAAAAANNAAAAAA..
.EAAAAAAAANNAAEAA.
.EAA.EAAAAAANAEAA.
.EAA.EAAAAAAAE.AA.
..AA.NNNNYNNNN.AA.
......RRRRRRR.....`
const ORC_LEGS = {
  a:    ["....AA..RRR..EE...", "...AA.........EE..", "..NNN.........NNN."],
  pass: [".....EERRRRREE....", ".....EE.RRR.EE....", ".....EE.....EE....", "....NNN....NNN...."],
  b:    ["....EE..RRR..AA...", "...EE.........AA..", "..NNN.........NNN."],
}
const orc = (legs) => (c) => {
  const L = ORC_LEGS[legs]
  c.grid(0, 21 - L.length, L.join("\n"))
  c.grid(0, 1 - (L.length - 3), ORC_TOP)
  c.px(6, 3 - (L.length - 3) + 1, "w")                                        // helmet glint
}
anim("orc_walk", { w: 18, h: 21, fps: 6, outline: "k" },
  frame(orc("a")), frame(orc("pass")), frame(orc("b")), frame(orc("pass")))

// ---- Orc Chief (mini-boss, 30x30 + outline = 32x32): the orc's warlord. Iron helmet with two great
// bone horns, a red war-paint mask with burning yellow eyes, tusks, a brown bear-pelt mantle, gold-buckled
// belt, red loincloth, iron-studded bracers. No weapon: his horns are the weapon (he charges with them).
const CHIEF_TOP = `
....y...................y.....
...yp...................py....
...pD...................Dp....
...ppD.....XXXXXXX.....Dpp....
....ppD..XXxxxxxxxXX..Dpp.....
.....ppDXxxwxxxxxxxXXDpp......
......pDXxxxxxxxxxxxXXDp......
........XXXXXXXXXXXXXX........
.........ERRRRRRRRRRRR........
......AAERRRyyRRRyyRRRAA......
.......EEEAAAAAAAEAAAAE.......
........EwAAAAAAAAAAwA........
........EwAkkkkkkkkAwA........
........EEkAArAAArAkAA........
....uuunnEEAArAAArAAnnnunN....
...unnununnnnnunnnnnnunnnnN...
..unnNnnNnnnNnnnNnnnNnnNnnNN..
..AAN.N..N.EAAAAN..N..N.NNEA..
.uAAA.AAANNNAAAAAAAAAEE.EAAA..
.AAAA.AAAAANNNAAAAAAAEE.EAAA..
.AAAA.AAAAAAAANYNAAAAEE.EAAAE.
.EAAA.AAAAAAAAAAANNNAEE.EAAAE.
.XxXX.AAAAAAAAAAAAAANNE.XxXXE.
.XXXX..NNNNNNNYYNNNNNN..XXXX..
.EAAE..NNNNNNNYoNNNNNN..EAAE..
..EE.....RRRRRRRRRRR.....EE...`
const CHIEF_LEGS = {
  a:    ["......AAA..RrR...EEE.....", ".....AAA.........EEE....", "....NNNN.........NNNN..."],
  pass: [".......EEERRRRREEE.......", ".......EEE.RrR.EEE.......", ".......EEE.....EEE.......", "......NNNN....NNNN......"],
  b:    ["......EEE..RrR...AAA.....", ".....EEE.........AAA....", "....NNNN.........NNNN..."],
}
const chief = (legs) => (c) => {
  const L = CHIEF_LEGS[legs], up = L.length - 3
  c.grid(2, 30 - L.length, L.join("\n"))
  c.grid(0, 1 - up, CHIEF_TOP)
}
anim("orcChief_walk", { w: 30, h: 30, fps: 6, outline: "k" },
  frame(chief("a")), frame(chief("pass")), frame(chief("b")), frame(chief("pass")))
// Wind-up (0.8 s, telegraph): he crouches low; every other frame his hide flushes red with rage, so the
// warning blinks even in a crowd (the game also shakes him).
const CROUCH = ["......AAA........EEE.....", "....NNNN.........NNNN..."]
const crouch = (c) => { c.grid(2, 28, CROUCH.join("\n")); c.grid(0, 2, CHIEF_TOP) }
anim("orcChief_windup", { w: 30, h: 30, fps: 10, outline: "k" },
  frame(crouch), frame(crouch, (c) => c.recolor({ A: "r", E: "R" })))
// Charge: head down so the horns lead and the helmet hides his eyes but for two burning slits, legs in a
// long sprint (he faces right; the game flips him and kicks up the dust).
const CHIEF_ROWS = CHIEF_TOP.split("\n").slice(1)
const CHIEF_HELM = CHIEF_ROWS.slice(0, 8).join("\n"), CHIEF_BODY = CHIEF_ROWS.slice(8).join("\n")
const CHARGE_LEGS = [
  ["....AAA.......RrR..EEE...", "..AAA...............EEE.", ".NNNN................NNNN"],
  [".......EEERRRRREEE.......", "......AAA.RrR.EEE.......", "......NNNN...NNNN......."],
]
const charge = (i) => (c) => {
  c.grid(0, 30 - CHARGE_LEGS[i].length, CHARGE_LEGS[i].join("\n"))
  const lean = (y) => Math.round((27 - y) / 7)                           // shear: the higher, the further forward
  const rows = (src, y0) => src.split("\n").forEach((r, k) => c.grid(lean(y0 + k), y0 + k, r))
  rows(CHIEF_BODY, 10 - i)
  rows(CHIEF_HELM, 5 - i)                                                  // helmet and horns pulled down over the brow
  for (const x of [13, 14, 18, 19]) c.px(x + lean(13), 13 - i, "y")       // eye slits under the rim
}
anim("orcChief_charge", { w: 30, h: 30, fps: 12, outline: "k" },
  frame(charge(0)), frame(charge(1)), frame(charge(0)), frame(charge(1)))

// ---- Pohon Tua, the treant (boss, 62x62 + outline = 64x64): an ancient oak walking on its roots. Mossy
// bark lit from the top-left, a deep leafy crown dotted with pink blossoms (it still belongs to the cheerful
// forest), branch arms with twig claws, and a face carved in the trunk: angry brows over hollow eyes and
// a jagged mouth, both burning with a warm amber glow.
const CROWN = [[17, 16, 9], [46, 15, 10], [24, 8, 9], [39, 7, 9], [31, 14, 13], [11, 22, 6], [52, 22, 6], [31, 3, 6]]   // [x, y, r]
const CROWN_ORDER = CROWN.map((_, i) => i).sort((a, b) => CROWN[a][1] - CROWN[b][1])   // higher puffs behind
const BLOSSOM = [[20, 10], [37, 4], [47, 12], [28, 17], [12, 20], [52, 20], [40, 15]]
// arm poses: [shoulder dy, elbow, hand] relative to the shoulder (mirrored for the left arm)
const ARMS = {
  rest: [[6, 4], [12, 11]], mid: [[6, -2], [11, -6]], up: [[7, -8], [12, -17]], down: [[7, 8], [11, 17]],
}
// roots: [dx from trunk centre, splay, lift]
function root(c, x0, y0, dir, len, lift) {
  const x1 = x0 + dir * Math.round(len * 0.55), y1 = y0 + 5 - lift, x2 = x0 + dir * len, y2 = 61 - lift
  c.line(x0, y0, x1, y1, "N", 4); c.line(x1, y1, x2, y2, "N", 3); c.px(x2 + dir, y2, "N")
  c.line(x0 - dir, y0 - 1, x1, y1 - 1, "n"); c.line(x1, y1 - 1, x2 - dir, y2 - 1, "n")   // lit top edge
}
function arm(c, sx, sy, dir, pose) {
  const [[ex, ey], [hx, hy]] = ARMS[pose], x1 = sx + dir * ex, y1 = sy + ey, x2 = sx + dir * hx, y2 = sy + hy
  c.line(sx, sy, x1, y1, "N", 4); c.line(x1, y1, x2, y2, "N", 3)
  c.line(sx, sy - 1, x1, y1 - 1, "n"); c.line(x1, y1 - 1, x2, y2 - 1, "n")
  const ux = x2 - x1, uy = y2 - y1, d = Math.hypot(ux, uy) || 1, fx = ux / d, fy = uy / d
  for (const a of [-0.7, 0, 0.7]) {                                        // three twig claws fanning out
    const ca = Math.cos(a), sa = Math.sin(a), tx = fx * ca - fy * sa * dir, ty = fy * ca + fx * sa * dir
    c.line(x2, y2, Math.round(x2 + tx * 4), Math.round(y2 + ty * 4), "N")
  }
  c.px(x1 - dir, y1 - 3, "G"); c.px(x1, y1 - 3, "g"); c.px(x1, y1 - 4, "G")  // a leaf sprouting at the elbow
}
function treant(c, { bob = 0, lift = [0, 0, 0, 0], sway = 0, arms = "rest", mouth = 0, flare = false }) {
  // roots: back pair first, then the front pair over them
  root(c, 26, 50 + bob, -1, 12, lift[0]); root(c, 36, 50 + bob, 1, 12, lift[1])
  root(c, 28, 52 + bob, -1, 20, lift[2]); root(c, 34, 52 + bob, 1, 20, lift[3])
  // trunk: wider at the base, bark lit from the left
  const top = 20 + bob, base = 54 + bob
  for (let y = top; y <= base; y++) {
    const t = (y - top) / (base - top), hw = Math.round(10 + t * t * 5)
    c.hline(31 - hw, y, hw * 2 + 1, "n")
    c.hline(31 - hw, y, 2, "u"); c.hline(31 + hw - 2, y, 3, "N")
  }
  for (const [x, y0, len, k] of [[23, 24, 26, 1], [40, 22, 30, -1], [30, 46, 9, 0], [36, 23, 7, 0]])   // bark crevices
    for (let i = 0; i < len; i++) c.px(x + Math.round(Math.sin(i * 0.35) * k), y0 + bob + i, "N")
  for (const [x, y] of [[20, 50], [21, 49], [22, 50], [42, 47], [43, 48], [24, 26], [25, 25]]) c.px(x, y + bob, "G")   // moss
  // crown
  const at = (i) => { const [x, y, r] = CROWN[i]; return [x + Math.round(sway * (1 - y / 30)), y + bob, r] }
  for (const i of CROWN_ORDER) {
    const [x, y, r] = at(i)
    c.circ(x, y, r, "F"); c.circ(x - 1, y - 1, r - 1, "G"); c.circ(x, y, r - 2, "f")
    if (r >= 8) { c.circ(x - 2, y - 2, r - 5, "G"); c.circ(x - 1, y - 1, r - 5, "f") }   // inner leaf clump
    c.px(x - Math.round(r * 0.5), y - Math.round(r * 0.6), "j")
  }
  for (const [x0, y] of BLOSSOM) { const x = x0 + Math.round(sway * (1 - y / 30)); c.px(x, y + bob, "i"); c.px(x + 1, y + bob, "w"); c.px(x, y + 1 + bob, "r") }
  c.hline(22, 27 + bob, 19, "F"); c.hline(24, 28 + bob, 15, "N")         // the crown's shadow on the trunk
  arm(c, 22, 31 + bob, -1, arms); arm(c, 40, 31 + bob, 1, arms)           // over the crown: raised claws stay visible
  // face: heavy brows slanting down to the middle, deep hollow eyes, a nose ridge, the mouth
  const fy = 31 + bob, fx = 31
  c.grid(fx - 8, fy, `
NNN...........NNN
NNNNN.......NNNNN
.NNNNNN...NNNNNN.
..kkkkkN.Nkkkkk..
..kYyyYk.kYyyYk..
..kkYYkk.kkYYkk..
...kkkk...kkkk...
.........N.......
........NNN......`)
  if (flare) for (const x of [fx - 5, fx - 4, fx + 3, fx + 4]) c.px(x, fy + 4, "w")
  const MOUTH = [`
.kkkkkkkkkkk.
kuukuukuukuuk
kYoooooooooYk
.kkkkkkkkkkk.`, `
.kkkkkkkkkkk.
kuukuukuukuuk
kYoooooooooYk
kooyyyyyyyook
.kukkukkukuk.
..kkkkkkkkk..`, `
.kkkkkkkkkkk.
kuukuukuukuuk
kYoooooooooYk
kooyyyyyyyook
kooyywwwyyook
.kukkukkukuk.
..kkkkkkkkk..`][mouth]
  c.grid(fx - 6, fy + 10, MOUTH)
  c.ellipse(37, 50 + bob, 2, 1, "k"); c.px(36, 49 + bob, "N")               // a knot hole low on the trunk
}
const TREANT_FACE = (x, y) => x > 20 && x < 44 && y > 30 && y < 50
const TREANT_GLOW = glow("Yyw", { where: TREANT_FACE, r: 2, strength: 0.5, bands: 2, color: "#ffd23f" })
// Walk: slow and heavy. The crown sways against the step, the front roots take turns lifting.
anim("treant_walk", { w: 62, h: 62, fps: 4, outline: "k" },
  frame((c) => treant(c, { bob: 0, lift: [0, 0, 3, 0], sway: -1 })),
  frame((c) => treant(c, { bob: 1, lift: [0, 0, 0, 0], sway: 0 })),
  frame((c) => treant(c, { bob: 0, lift: [0, 0, 0, 3], sway: 1 })),
  frame((c) => treant(c, { bob: 1, lift: [0, 0, 0, 0], sway: 0 })),
  TREANT_GLOW)
// Attack (summons the roots): arms rise, eyes flare white, he roars and slams his claws down.
anim("treant_attack", { w: 62, h: 62, fps: 8, loop: false, outline: "k" },
  frame((c) => treant(c, { arms: "mid", mouth: 1 })),
  frame((c) => treant(c, { bob: -1, arms: "up", mouth: 2, flare: true, sway: -1 })),
  frame((c) => treant(c, { bob: -1, arms: "up", mouth: 2, flare: true, sway: -1 })),
  frame((c) => treant(c, { bob: 1, arms: "down", mouth: 2, flare: true, sway: 1 })),
  frame((c) => treant(c, { arms: "rest", mouth: 1 })),
  TREANT_GLOW)

// Forest witch, side view: crooked navy hat with a magenta band, pale green face, glowing magenta
// eye, grey hair, navy robe with a ragged hem, gnarled staff with a magenta orb. She glides (hem sways).
// The magenta glow ties her to her shots: no player spell uses magenta.
const WITCH = `
..M............
..MM...........
...MM..........
....MBM........
....MBMM.......
...MBBMMM......
..dddddddd.....
.MBBMMMMMMMM...
...xxjjjmjj....
...xxjjjjjjj...
..xxxgjjkj.....
..xxBMMMMMP....
..xBMMMMMMMjj..
..BMMMMMMMP....
..BMMMMMMMP....
.BMMMMMMMMMP...
.BMMMMMMMMMP...
BMMMMMMMMMMMP..`
const WITCH_HEM = ["M.MM.M.MM.M....", ".MM.MM.M.MM....", "M.M.MM.MM.M....", ".M.MM.M.M.MM..."]
const staff = (top) => (c) => {
  c.vline(12, top + 2, 21 - top - 2, "N"); c.px(13, top + 4, "N"); c.px(13, top + 9, "N")  // gnarled
  c.vline(12, top + 3, 2, "n")
  c.circ(12, top + 1, 1, "m"); c.px(11, top, "w"); c.px(12, top + 1, "w")
}
const witch = (hem, top) => (c) => {
  c.grid(0, 2, WITCH)
  c.grid(0, 20, WITCH_HEM[hem])
  staff(top)(c)
}
const WITCH_GLOW = glow("mw", { where: (x) => x >= 10, r: 2, strength: 0.6, bands: 2, color: "#ff5ad9" })
anim("witch_walk", { w: 15, h: 22, fps: 6, outline: "k" },
  ...[0, 1, 2, 3].map((i) => frame(witch(i, 8 + (i % 2)))), WITCH_GLOW)
// Cast: the staff rises, the orb swells and throws sparks, then she fires.
anim("witch_cast", { w: 15, h: 22, fps: 10, outline: "k" },
  frame(witch(0, 6)),
  frame(witch(0, 4), (c) => c.circ(12, 5, 2, "m")),
  frame(witch(1, 3), (c) => { c.circ(12, 4, 2, "m"); c.px(12, 4, "w"); c.px(14, 1, "m"); c.px(10, 0, "m") }),
  frame(witch(1, 3), (c) => { c.circ(12, 4, 1, "w"); c.px(14, 0, "w"); c.px(10, 1, "w"); c.px(14, 7, "m") }),
  WITCH_GLOW)

// Witch shot: a slow magenta orb with a white core and a spinning sparkle. Glows; no outline, like
// the fireball, so it reads as light, not as a body.
anim("witchShot_fly", { w: 9, h: 9, fps: 10, frames: 4 }, (c) => {
  c.circ(4, 4, 3, "d"); c.circ(4, 4, 2, "m"); c.px(4, 4, "w"); c.px(3, 3, "w")
  const s = [[4, 0], [8, 4], [4, 8], [0, 4]][c.frame], s2 = [[1, 1], [7, 1], [7, 7], [1, 7]][c.frame]
  c.px(s[0], s[1], "m"); c.px(s2[0], s2[1], "w")
},
  glow("mw", { r: 2, strength: 0.6, bands: 2 }))

sheet("enemies", ["slime*", "kingSlime*", "treant*", "bat*", "goblin*", "wolf*", "orc*", "witch*"])
