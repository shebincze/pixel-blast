// 5x7 bitmap font. Text drawn with the page font gets blurry once the canvas is
// scaled up, so every string in the game is rendered from these pixel glyphs.

const GLYPHS = {
  A: '.###.|#...#|#...#|#####|#...#|#...#|#...#',
  B: '####.|#...#|#...#|####.|#...#|#...#|####.',
  C: '.###.|#...#|#....|#....|#....|#...#|.###.',
  D: '####.|#...#|#...#|#...#|#...#|#...#|####.',
  E: '#####|#....|#....|####.|#....|#....|#####',
  F: '#####|#....|#....|####.|#....|#....|#....',
  G: '.###.|#...#|#....|#.###|#...#|#...#|.###.',
  H: '#...#|#...#|#...#|#####|#...#|#...#|#...#',
  I: '#####|..#..|..#..|..#..|..#..|..#..|#####',
  J: '..###|...#.|...#.|...#.|...#.|#..#.|.##..',
  K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#',
  L: '#....|#....|#....|#....|#....|#....|#####',
  M: '#...#|##.##|#.#.#|#...#|#...#|#...#|#...#',
  N: '#...#|##..#|#.#.#|#..##|#...#|#...#|#...#',
  O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.',
  P: '####.|#...#|#...#|####.|#....|#....|#....',
  Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#',
  R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
  S: '.####|#....|#....|.###.|....#|....#|####.',
  T: '#####|..#..|..#..|..#..|..#..|..#..|..#..',
  U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.',
  V: '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..',
  W: '#...#|#...#|#...#|#...#|#.#.#|##.##|#...#',
  X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
  Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..',
  Z: '#####|....#|...#.|..#..|.#...|#....|#####',
  0: '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.',
  1: '..#..|.##..|..#..|..#..|..#..|..#..|.###.',
  2: '.###.|#...#|....#|...#.|..#..|.#...|#####',
  3: '####.|....#|....#|.###.|....#|....#|####.',
  4: '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.',
  5: '#####|#....|####.|....#|....#|#...#|.###.',
  6: '.###.|#....|#....|####.|#...#|#...#|.###.',
  7: '#####|....#|...#.|..#..|.#...|.#...|.#...',
  8: '.###.|#...#|#...#|.###.|#...#|#...#|.###.',
  9: '.###.|#...#|#...#|.####|....#|....#|.###.',
  '!': '..#..|..#..|..#..|..#..|..#..|.....|..#..',
  '?': '.###.|#...#|....#|..##.|..#..|.....|..#..',
  '.': '.....|.....|.....|.....|.....|.....|..#..',
  ',': '.....|.....|.....|.....|.....|..#..|.#...',
  ':': '.....|..#..|..#..|.....|..#..|..#..|.....',
  '-': '.....|.....|.....|#####|.....|.....|.....',
  '+': '.....|..#..|..#..|#####|..#..|..#..|.....',
  '=': '.....|.....|#####|.....|#####|.....|.....',
  '/': '....#|....#|...#.|..#..|.#...|#....|#....',
  '(': '..##.|.#...|#....|#....|#....|.#...|..##.',
  ')': '.##..|...#.|....#|....#|....#|...#.|.##..',
  "'": '..#..|..#..|.....|.....|.....|.....|.....',
  '<': '...#.|..#..|.#...|#....|.#...|..#..|...#.',
  '>': '.#...|..#..|...#.|....#|...#.|..#..|.#...',
  '*': '.....|#.#.#|.###.|#####|.###.|#.#.#|.....',
};

export const GLYPH_W = 5;
export const GLYPH_H = 7;
const ADVANCE = GLYPH_W + 1;

// Glyph bitmaps are baked once per color, then blitted — no per-pixel fills.
const cache = new Map();

function glyph(char, color) {
  let byChar = cache.get(color);
  if (!byChar) {
    byChar = new Map();
    cache.set(color, byChar);
  }
  let baked = byChar.get(char);
  if (baked !== undefined) return baked;

  const rows = GLYPHS[char];
  if (!rows) {
    byChar.set(char, null);
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = GLYPH_W;
  canvas.height = GLYPH_H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  rows.split('|').forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '#') ctx.fillRect(x, y, 1, 1);
    }
  });
  byChar.set(char, canvas);
  return canvas;
}

/** Width in pixels a string will occupy at the given scale. */
export function textWidth(text, scale = 1) {
  if (!text.length) return 0;
  return (text.length * ADVANCE - 1) * scale;
}

/**
 * Draw crisp pixel text. align: 'left' | 'center' | 'right'.
 * Coordinates are the top-left of the first glyph (top edge for center/right).
 */
export function drawText(ctx, text, x, y, { color = '#ffffff', scale = 1, align = 'left' } = {}) {
  const value = String(text).toUpperCase();
  const width = textWidth(value, scale);
  let cursor = Math.round(align === 'center' ? x - width / 2 : align === 'right' ? x - width : x);
  const top = Math.round(y);

  for (const char of value) {
    const baked = glyph(char, color);
    if (baked) ctx.drawImage(baked, cursor, top, GLYPH_W * scale, GLYPH_H * scale);
    cursor += ADVANCE * scale;
  }
}
