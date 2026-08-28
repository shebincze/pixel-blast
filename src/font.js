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

// Accents are painted in two extra rows above the 5x7 cell, so any latin letter
// with a diacritic (Czech, Slovak, and the usual western european ones) can be
// composed from a base glyph plus a mark instead of hand-drawing every variant.
const MARK_H = 2;
const MARKS = {
  '\u0301': '...#.|..#..', // acute
  '\u0300': '.#...|..#..', // grave
  '\u0302': '..#..|.#.#.', // circumflex
  '\u030c': '.#.#.|..#..', // caron
  '\u0303': '.##.#|#.##.', // tilde
  '\u0308': '.#.#.|.....', // diaeresis
  '\u030a': '.###.|.#.#.', // ring
  '\u0304': '.....|.###.', // macron
  '\u0306': '#...#|.###.', // breve
  '\u030b': '..#.#|.#.#.', // double acute
};

// Letters with no decomposition at all get spelled out with what the font has.
const SUBS = {
  '\u0141': 'L', '\u0142': 'L', // L with stroke
  '\u00d8': 'O', '\u00f8': 'O', // O with stroke
  '\u0110': 'D', '\u0111': 'D', // D with stroke
  '\u00c6': 'AE', '\u00e6': 'AE',
  '\u0152': 'OE', '\u0153': 'OE',
  '\u00df': 'SS',
  '\u00de': 'P', '\u00d0': 'D',
  '_': '-', '\u2013': '-', '\u2014': '-',
  '\u201c': "'", '\u201d': "'", '\u2018': "'", '\u2019': "'", '"': "'",
};

/** Split a character into a drawable base glyph plus an accent, when possible. */
function decompose(char) {
  const parts = char.normalize('NFD');
  if (parts.length !== 2) return null;
  const base = parts[0];
  const mark = parts[1];
  if (!GLYPHS[base] || !MARKS[mark]) return null;
  return { base, mark };
}

/**
 * Fold arbitrary player input down to what the font can actually draw: letters
 * keep their accents, anything else falls back to its plain latin base.
 */
export function normalizeText(text) {
  let out = '';
  for (const char of String(text).toUpperCase().normalize('NFC')) {
    if (char === ' ') {
      out += ' ';
      continue;
    }
    if (GLYPHS[char] || decompose(char)) {
      out += char;
      continue;
    }
    const sub = SUBS[char];
    if (sub !== undefined) {
      out += sub;
      continue;
    }
    const stripped = char.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (const plain of stripped) if (GLYPHS[plain]) out += plain;
  }
  return out;
}

// Glyph bitmaps are baked once per color, then blitted - no per-pixel fills.
const cache = new Map();

function paint(ctx, rows, offsetY) {
  rows.split('|').forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '#') ctx.fillRect(x, y + offsetY, 1, 1);
    }
  });
}

function glyph(char, color) {
  let byChar = cache.get(color);
  if (!byChar) {
    byChar = new Map();
    cache.set(color, byChar);
  }
  let baked = byChar.get(char);
  if (baked !== undefined) return baked;

  const accented = GLYPHS[char] ? null : decompose(char);
  const rows = GLYPHS[char] || (accented && GLYPHS[accented.base]);
  if (!rows) {
    byChar.set(char, null);
    return null;
  }

  const top = accented ? MARK_H : 0;
  const canvas = document.createElement('canvas');
  canvas.width = GLYPH_W;
  canvas.height = GLYPH_H + top;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  if (accented) paint(ctx, MARKS[accented.mark], 0);
  paint(ctx, rows, top);

  baked = { canvas, top };
  byChar.set(char, baked);
  return baked;
}

/** Width in pixels a string will occupy at the given scale. */
export function textWidth(text, scale = 1) {
  const value = normalizeText(text);
  if (!value.length) return 0;
  return (value.length * ADVANCE - 1) * scale;
}

/**
 * Draw crisp pixel text. align: 'left' | 'center' | 'right'.
 * Coordinates are the top-left of the first glyph (top edge for center/right).
 */
export function drawText(ctx, text, x, y, { color = '#ffffff', scale = 1, align = 'left' } = {}) {
  const value = normalizeText(text);
  const width = textWidth(value, scale);
  let cursor = Math.round(align === 'center' ? x - width / 2 : align === 'right' ? x - width : x);
  const top = Math.round(y);

  for (const char of value) {
    const baked = glyph(char, color);
    if (baked) {
      ctx.drawImage(
        baked.canvas,
        cursor,
        top - baked.top * scale,
        GLYPH_W * scale,
        baked.canvas.height * scale,
      );
    }
    cursor += ADVANCE * scale;
  }
}
