// Hutan Cerah: the one palette for every asset. Start each art file with include("palette.px.js").
// Lowercase = light, uppercase = dark. Greens/water/wood/monsters come from mockup B ("cerah").
pal({
  k: "#1d1a2f", // outline, eyes (deep ink, never pure black)
  // greens: grass, leaves, trees
  F: "#1f5b3c", // deep forest shadow
  f: "#2f7d3a", // tree
  G: "#46a24a", // leaves, grass shade
  g: "#7fcf5c", // grass
  q: "#6ab84d", // grass mid: shade on grass, tufts (mockup B grass2)
  j: "#c3ef84", // lime highlight
  // blues: water, sky, mage robe
  M: "#2b3486", // navy: robe/hat shadow, deep water
  B: "#2f6fc4", // blue: robe
  b: "#4aa8e0", // river, robe light
  s: "#8fd3f5", // foam, sky, sheen
  // wood and earth
  N: "#6b4030", // dark wood, boots
  n: "#b77a45", // wood, hut, staff
  u: "#e0a96a", // light wood
  p: "#d9c27a", // path, sand
  D: "#b09a5c", // path/sand shadow, worn edge
  // monster reds and violets
  R: "#a3324a", // dark red
  r: "#e2585e", // monster red, roof
  i: "#ff9f9a", // pink highlight
  P: "#3b2466", // deep purple: archmage robe/hood shadow
  V: "#5a3a9e", // dark violet
  v: "#9b5de5", // violet: monsters, arcane spells
  l: "#d3b0ff", // lavender
  // fire and light (spells)
  O: "#e8532e", // hot orange-red
  o: "#ff9a3c", // orange
  Y: "#ffd23f", // gold, fire core, trims
  y: "#fff1a8", // pale yellow light
  w: "#ffffff", // white-hot core, eye shine
  // ice (spells)
  C: "#3ccfe0", // ice cyan
  c: "#a6f6ff", // pale ice
  e: "#7cf0ff", // bright glow mark: staff crystal pulse, runes, glowing eyes
  // skin
  H: "#e09a78", // skin shadow
  h: "#ffd2a6", // skin
  // stone and smoke
  X: "#5d5a78", // stone dark, smoke
  x: "#a3a3c2", // stone light, smoke light
})
ramps("kFfGgj", "kMBbs", "kBCcw", "kNnup", "kRri", "kROoYyw", "kPVvl", "kHh", "kXx")
// Added for monsters (Task 6): keys that never clash with the grass, the mage or the player's spells.
pal({
  t: "#5ee0a0", // slime mint (green slime that still pops on the grass)
  T: "#2b9a78", // slime mint shadow
  a: "#c8ffe6", // slime mint highlight
  A: "#8a9a58", // orc hide (khaki olive)
  E: "#5a6638", // orc hide shadow
  m: "#ff5ad9", // hex magenta: witch magic, enemy shots (no player spell uses it)
  d: "#a3238f", // dark magenta
})
ramps("kTta", "kEA", "kdmw")
// Added for pickups (Task 7b).
pal({
  K: "#6b1c33", // deep crimson: red gem pavilion
})
// Added for the UI (Task 8): card and panel bodies, a shade under the ink outline.
pal({
  U: "#2a2346", // card / panel body (ink-violet, a step above k so the outline still reads)
  Z: "#463a72", // card border mid (between U and V)
})
// Added for Orb Arcane (Task 10a): its own orchid, so it never reads as the witch's hex magenta.
pal({
  z: "#d87bff", // arcane orchid: orb body, arcane glow
})
ramps("kPVvzlw")
