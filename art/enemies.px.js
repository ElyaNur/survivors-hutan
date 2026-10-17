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

sheet("enemies", ["slime*", "bat*", "goblin*", "wolf*", "orc*", "witch*"])
