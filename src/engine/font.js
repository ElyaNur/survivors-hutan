// Pixel font: glyph_<charCode> sprites from the ui sheet (pxl's 3x5 font + an outline baked in).
// Positions are the ink's top-left; the 1px outline spills one pixel around it.
const NARROW = { '.': 1, '!': 1, ':': 1, "'": 1, '|': 1, ',': 2, ';': 2, '(': 2, ')': 2, '[': 2, ']': 2, '`': 2, '~': 4, '★': 5, '→': 5 };
export const LINE_H = 5;
const glyphW = ch => NARROW[ch] ?? 3;

export function textWidth(str, scale = 1) {
  let w = 0;
  for (const ch of str) w += glyphW(ch) + 1;
  return Math.max(0, w - 1) * scale;
}

// Greedy word wrap to maxW pixels (a word longer than maxW gets its own line).
export function wrapText(str, maxW) {
  const lines = [];
  let line = '';
  for (const word of str.split(' ')) {
    const next = line ? line + ' ' + word : word;
    if (line && textWidth(next) > maxW) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

const opt = { alpha: 1 };                                    // reused: no per-glyph allocation
// color: 'w' (white) | 'y' | 'r' | 'g' | 'x' (grey) | 'c' (ice). Chars outside the sheet draw as '?'.
export function drawText(ctx, assets, str, x, y, { color = 'w', align = 'left', scale = 1, alpha = 1 } = {}) {
  str = String(str);
  if (align !== 'left') x -= textWidth(str, scale) / (align === 'center' ? 2 : 1);
  x = Math.round(x); y = Math.round(y);
  const suffix = color === 'w' ? '' : '_' + color;
  opt.alpha = alpha;
  if (scale !== 1) { ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); x = 0; y = 0; }
  for (const ch of str) {
    if (ch !== ' ') {
      let name = 'glyph_' + ch.codePointAt(0) + suffix;
      if (!assets.has(name)) name = 'glyph_63' + suffix;
      const s = assets.size(name);                           // ink + 1px outline on each side
      assets.draw(ctx, name, x - 1 + (s.w >> 1), y - 1 + (s.h >> 1), opt);
    }
    x += glyphW(ch) + 1;
  }
  if (scale !== 1) ctx.restore();
}
