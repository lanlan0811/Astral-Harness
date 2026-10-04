/**
 * Generates the application icon set.
 *
 * Tauri needs PNG/ICO/ICNS checked in before it will bundle anything, and the usual
 * `tauri icon` route needs the CLI plus a source bitmap. This draws the mark
 * directly — a brand-to-accent gradient with a cut "A" — and encodes each container
 * by hand, so the icons are reproducible and reviewable as code.
 *
 *   node scripts/generate-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "src-tauri", "icons");

/** Matches the app's `--color-brand` / `--color-accent` gradient. */
const BRAND = [99, 102, 241];
const ACCENT = [14, 165, 233];

/** 4x supersampling — cheap antialiasing without a rasteriser. */
const SAMPLES = 4;

// ---------------------------------------------------------------------------
// drawing
// ---------------------------------------------------------------------------

/**
 * Returns coverage in 0..1 for one point.
 *
 * The mark is a rounded square with a triangular counter cut out of it and a crossbar
 * left standing across that counter, which reads as an "A" at every size the OS will
 * actually render.
 */
function coverage(x, y, size) {
  const radius = size * 0.22;
  if (!insideRoundedSquare(x, y, size, radius)) return 0;

  const apexX = size * 0.5;
  const apexY = size * 0.29;
  const leftX = size * 0.31;
  const leftY = size * 0.79;
  const rightX = size * 0.69;
  const rightY = size * 0.79;

  const inCounter = pointInTriangle(x, y, apexX, apexY, leftX, leftY, rightX, rightY);
  if (!inCounter) return 1;

  // The crossbar is the only part of the counter that stays filled.
  const barCenter = size * 0.6;
  const barHalfHeight = size * 0.055;
  const barHalfWidth = size * 0.2;
  const inBar = Math.abs(y - barCenter) <= barHalfHeight && Math.abs(x - apexX) <= barHalfWidth;
  return inBar ? 1 : 0;
}

function insideRoundedSquare(x, y, size, radius) {
  const inset = size * 0.045;
  const min = inset;
  const max = size - inset;
  if (x < min || y < min || x > max || y > max) return false;

  const cx = Math.min(Math.max(x, min + radius), max - radius);
  const cy = Math.min(Math.max(y, min + radius), max - radius);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = sign(px, py, ax, ay, bx, by);
  const d2 = sign(px, py, bx, by, cx, cy);
  const d3 = sign(px, py, cx, cy, ax, ay);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function sign(px, py, ax, ay, bx, by) {
  return (px - bx) * (ay - by) - (ax - bx) * (py - by);
}

function renderRgba(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const step = 1 / SAMPLES;
  const total = SAMPLES * SAMPLES;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let hits = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const x = px + (sx + 0.5) * step;
          const y = py + (sy + 0.5) * step;
          if (coverage(x, y, size) > 0.5) hits++;
        }
      }
      const alpha = Math.round((hits / total) * 255);
      const t = (px / size + py / size) / 2;
      const offset = (py * size + px) * 4;
      pixels[offset] = Math.round(BRAND[0] + (ACCENT[0] - BRAND[0]) * t);
      pixels[offset + 1] = Math.round(BRAND[1] + (ACCENT[1] - BRAND[1]) * t);
      pixels[offset + 2] = Math.round(BRAND[2] + (ACCENT[2] - BRAND[2]) * t);
      pixels[offset + 3] = alpha;
    }
  }
  return pixels;
}

// ---------------------------------------------------------------------------
// encoding
// ---------------------------------------------------------------------------

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, pixels) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/** ICO with PNG-compressed entries — supported by every OS Tauri ships to. */
function encodeIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(entries.length, 4);

  const directory = Buffer.alloc(16 * entries.length);
  let offset = 6 + directory.length;
  const bodies = [];

  entries.forEach((entry, index) => {
    const at = index * 16;
    directory[at] = entry.size >= 256 ? 0 : entry.size;
    directory[at + 1] = entry.size >= 256 ? 0 : entry.size;
    directory[at + 2] = 0; // palette
    directory[at + 3] = 0;
    directory.writeUInt16LE(1, at + 4); // colour planes
    directory.writeUInt16LE(32, at + 6); // bits per pixel
    directory.writeUInt32LE(entry.data.length, at + 8);
    directory.writeUInt32LE(offset, at + 12);
    offset += entry.data.length;
    bodies.push(entry.data);
  });

  return Buffer.concat([header, directory, ...bodies]);
}

/** ICNS holding PNG entries, which macOS accepts from 10.11 onward. */
function encodeIcns(entries) {
  const TYPES = {
    16: "icp4",
    32: "icp5",
    64: "icp6",
    128: "ic07",
    256: "ic08",
    512: "ic09",
    1024: "ic10",
  };

  const chunks = entries.map((entry) => {
    const head = Buffer.alloc(8);
    head.write(TYPES[entry.size], 0, 4, "ascii");
    head.writeUInt32BE(entry.data.length + 8, 4);
    return Buffer.concat([head, entry.data]);
  });

  const body = Buffer.concat(chunks);
  const header = Buffer.alloc(8);
  header.write("icns", 0, 4, "ascii");
  header.writeUInt32BE(body.length + 8, 4);
  return Buffer.concat([header, body]);
}

// ---------------------------------------------------------------------------

const SIZES = [16, 32, 48, 64, 128, 256, 512, 1024];
const cache = new Map();
const png = (size) => {
  if (!cache.has(size)) cache.set(size, encodePng(size, renderRgba(size)));
  return cache.get(size);
};

mkdirSync(OUT_DIR, { recursive: true });

for (const name of ["32x32.png", "128x128.png", "128x128@2x.png", "icon.png"]) {
  const size = { "32x32.png": 32, "128x128.png": 128, "128x128@2x.png": 256, "icon.png": 512 }[name];
  writeFileSync(join(OUT_DIR, name), png(size));
  console.log(`${name} (${size}px)`);
}

writeFileSync(join(OUT_DIR, "Square150x150Logo.png"), png(150));
writeFileSync(join(OUT_DIR, "StoreLogo.png"), png(50));
writeFileSync(join(OUT_DIR, "icon.ico"), encodeIco(SIZES.filter((s) => [16, 32, 48, 256].includes(s)).map((size) => ({ size, data: png(size) }))));
writeFileSync(join(OUT_DIR, "icon.icns"), encodeIcns([256, 512, 1024].map((size) => ({ size, data: png(size) }))));
console.log("icon.ico, icon.icns, Square150x150Logo.png, StoreLogo.png");