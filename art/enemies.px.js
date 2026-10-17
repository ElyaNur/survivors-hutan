include("palette.px.js")

// Red slime, facing right. Hops: rest, squash (wind-up), stretch (jump), land.
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
    c.hline(cx - hw, y, hw * 2 + 1, "r")
    if (t >= dome - 2) c.px(cx + hw, y, "R")             // right-side shadow
  }
  c.hline(cx - rx + 1, bot, rx * 2 - 1, "R")             // belly shadow
  c.px(cx + rx - 1, bot - 1, "R")
  const hy = top + 2, hx = cx - rx + 2                   // top-left sheen
  c.px(hx, hy, "w"); c.px(hx + 1, hy - 1, "i"); c.px(hx - 1, hy + 1, "i"); c.px(hx, hy + 1, "i")
  const ey = top + Math.round(h * 0.45)                  // eyes look right
  c.vline(cx + 1, ey, 2, "k"); c.vline(cx + 4, ey, 2, "k")
  c.px(cx + 1, ey, "w"); c.px(cx + 4, ey, "w")
  c.px(cx + 5, ey + 2, "i")                              // blush
})

sheet("enemies", ["slime*"])
