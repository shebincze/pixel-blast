// Generates the launcher icons and the Play Store artwork straight from the
// game's own sprite data, so the store art and the game never drift apart.
// Pure Node: a tiny PNG encoder (zlib deflate + CRC32), no image libraries.
import { deflateSync } from 'node:zlib';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'src', 'sprites.js'), 'utf8');

/** Pull `const NAME = ['...','...'];` blocks and the palette out of sprites.js. */
function parseSprite(name) {
  const match = new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`).exec(source);
  if (!match) throw new Error(`sprite ${name} not found`);
  return match[1].match(/'([^']*)'/g).map((row) => row.slice(1, -1));
}

const palette = {};
for (const [, key, color] of source
  .slice(source.indexOf('const PALETTE'), source.indexOf('};', source.indexOf('const PALETTE')))
  .matchAll(/(\w): '(#[0-9a-fA-F]{6})'/g)) {
  palette[key] = color;
}

const hex = (color) => [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));

class Bitmap {
  constructor(width, height) {
    this.w = width;
    this.h = height;
    this.data = new Uint8Array(width * height * 4);
  }

  set(x, y, [r, g, b], a = 255) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    if (a === 255) {
      this.data.set([r, g, b, 255], i);
      return;
    }
    // simple source-over so glows can be layered
    const src = a / 255;
    const dst = this.data[i + 3] / 255;
    const out = src + dst * (1 - src);
    this.data[i] = Math.round((r * src + this.data[i] * dst * (1 - src)) / out);
    this.data[i + 1] = Math.round((g * src + this.data[i + 1] * dst * (1 - src)) / out);
    this.data[i + 2] = Math.round((b * src + this.data[i + 2] * dst * (1 - src)) / out);
    this.data[i + 3] = Math.round(out * 255);
  }

  rect(x, y, w, h, color, a = 255) {
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) this.set(x + dx, y + dy, color, a);
  }

  /** Blit a string-rows sprite scaled by whole pixels. */
  sprite(rows, x, y, scale) {
    for (let ry = 0; ry < rows.length; ry++) {
      for (let rx = 0; rx < rows[ry].length; rx++) {
        const ch = rows[ry][rx];
        if (ch === '.' || !palette[ch]) continue;
        this.rect(x + rx * scale, y + ry * scale, scale, scale, hex(palette[ch]));
      }
    }
  }
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, body) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(body.length);
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), body]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([length, typed, crc]);
}

function encodePng(bitmap) {
  const raw = Buffer.alloc((bitmap.w * 4 + 1) * bitmap.h);
  for (let y = 0; y < bitmap.h; y++) {
    raw[y * (bitmap.w * 4 + 1)] = 0; // filter: none
    Buffer.from(bitmap.data.buffer, y * bitmap.w * 4, bitmap.w * 4)
      .copy(raw, y * (bitmap.w * 4 + 1) + 1);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(bitmap.w, 0);
  header.writeUInt32BE(bitmap.h, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// The same 5x7 bitmap font the game draws with, so the artwork matches it.
const fontSource = readFileSync(join(root, 'src', 'font.js'), 'utf8');
const GLYPHS = {};
for (const [, key, rows] of fontSource.matchAll(/(?:^|\s)(?:'([^'])'|(\w)): '([^']+)',/gm)) {
  // handled below
}
{
  const body = fontSource.slice(fontSource.indexOf('const GLYPHS'), fontSource.indexOf('export const GLYPH_W'));
  for (const match of body.matchAll(/(?:'([^']{1})'|([A-Z0-9])):\s*'([^']+)'/g)) {
    GLYPHS[match[1] || match[2]] = match[3].split('|');
  }
}

function drawText(bmp, text, x, y, scale, color) {
  let cursor = x;
  for (const char of text.toUpperCase()) {
    const rows = GLYPHS[char];
    if (rows) {
      for (let ry = 0; ry < rows.length; ry++) {
        for (let rx = 0; rx < rows[ry].length; rx++) {
          if (rows[ry][rx] === '#') bmp.rect(cursor + rx * scale, y + ry * scale, scale, scale, hex(color));
        }
      }
    }
    cursor += 6 * scale;
  }
  return cursor - x - scale;
}

function textWidth(text, scale) {
  return text.length * 6 * scale - scale;
}

const PLAYER = parseSprite('PLAYER_IDLE');
const PISTOL = parseSprite('PISTOL');
const LASER = parseSprite('LASER');

function starField(bitmap, count, maxY) {
  for (let i = 0; i < count; i++) {
    const x = (i * 97) % bitmap.w;
    const y = (i * 53) % maxY;
    const bright = 140 + ((i * 37) % 110);
    bitmap.rect(x, y, Math.max(1, Math.round(bitmap.w / 220)), Math.max(1, Math.round(bitmap.w / 220)),
      [bright, bright, bright]);
  }
}

/** Square app icon: hero on the ground firing to the right. */
function makeIcon(size, { transparent = false, heroScale = 0.038 } = {}) {
  const bmp = new Bitmap(size, size);
  const groundY = Math.round(size * 0.80);

  if (!transparent) {
    for (let y = 0; y < groundY; y++) {
      const t = y / groundY;
      bmp.rect(0, y, size, 1, [
        Math.round(20 + t * 23),
        Math.round(26 + t * 16),
        Math.round(53 + t * 35),
      ]);
    }
    starField(bmp, 44, Math.round(size * 0.62));
    bmp.rect(0, groundY, size, Math.max(1, Math.round(size * 0.035)), hex('#4cc26a'));
    bmp.rect(0, groundY + Math.round(size * 0.035), size, size, hex('#5a3a2a'));
  }

  const scale = Math.max(1, Math.round(size * heroScale));
  const px = Math.round(size * 0.16);
  const py = groundY - 14 * scale;
  bmp.sprite(PLAYER, px, py, scale);
  bmp.sprite(PISTOL, px + 8 * scale, py + 8 * scale, scale);
  for (let i = 0; i < 3; i++) {
    bmp.sprite(LASER, px + 10 * scale + (i * 10 + 2) * scale, py + 7 * scale, scale);
  }
  return bmp;
}

/** 1024x500 Play feature graphic with the title spelled in game pixels. */
function makeFeature() {
  const bmp = new Bitmap(1024, 500);
  const groundY = 400;
  for (let y = 0; y < groundY; y++) {
    const t = y / groundY;
    bmp.rect(0, y, 1024, 1, [
      Math.round(16 + t * 24),
      Math.round(20 + t * 20),
      Math.round(44 + t * 40),
    ]);
  }
  starField(bmp, 90, 340);
  bmp.rect(0, groundY, 1024, 12, hex('#4cc26a'));
  bmp.rect(0, groundY + 12, 1024, 100, hex('#5a3a2a'));

  const scale = 7;
  const px = 70;
  const py = groundY - 14 * scale;
  bmp.sprite(PLAYER, px, py, scale);
  bmp.sprite(PISTOL, px + 8 * scale, py + 8 * scale, scale);
  for (let i = 0; i < 6; i++) {
    bmp.sprite(LASER, px + 10 * scale + (i * 12 + 3) * scale, py + 7 * scale, scale);
  }

  const titleScale = 11;
  drawText(bmp, 'PIXEL', Math.round((1024 - textWidth('PIXEL', titleScale)) / 2), 70, titleScale, '#7ef2ff');
  drawText(bmp, 'BLAST', Math.round((1024 - textWidth('BLAST', titleScale)) / 2), 170, titleScale, '#ffe14a');
  const tagline = 'skakacka pres prekazky';
  drawText(bmp, tagline, Math.round((1024 - textWidth(tagline, 4)) / 2), 268, 4, '#c8c8d8');
  return bmp;
}

const outDir = process.argv[2] || join(root, 'store');
mkdirSync(outDir, { recursive: true });

writeFileSync(join(outDir, 'icon-512.png'), encodePng(makeIcon(512)));
writeFileSync(join(outDir, 'feature-1024x500.png'), encodePng(makeFeature()));

// Launcher icons for every density, plus the adaptive foreground.
const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [density, size] of Object.entries(densities)) {
  const dir = join(root, 'android', 'app', 'src', 'main', 'res', `mipmap-${density}`);
  mkdirSync(dir, { recursive: true });
  const png = encodePng(makeIcon(size));
  writeFileSync(join(dir, 'ic_launcher.png'), png);
  writeFileSync(join(dir, 'ic_launcher_round.png'), png);
  // The adaptive foreground needs the safe zone: hero only, on transparency.
  writeFileSync(
    join(dir, 'ic_launcher_foreground.png'),
    encodePng(makeIcon(size * 2, { transparent: true, heroScale: 0.038 })),
  );
}

console.log(`icons written to ${outDir} and android/app/src/main/res/mipmap-*`);
