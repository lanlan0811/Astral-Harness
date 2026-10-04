/**
 * Exports the application icon set from the master artwork.
 *
 * Tauri needs PNG/ICO/ICNS checked in before it will bundle anything. The master is
 * `src-tauri/icons/Astral_icon_outer_black_removed.png`; everything else here is derived
 * from it, so re-running after a design change keeps every size in step.
 *
 *   node scripts/generate-icons.mjs
 *
 * Downscaling is a box filter over *premultiplied* alpha. Averaging straight RGBA would
 * drag the transparent corners' black into the edge pixels and leave a dark halo around
 * the rounded square — premultiplying first is what keeps the border clean.
 */
import { deflateSync, inflateSync } from "node:zlib";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ICONS_DIR = join(ROOT, "src-tauri", "icons");
const MASTER = join(ICONS_DIR, "Astral_icon_outer_black_removed.png");

// ---------------------------------------------------------------------------
// decode
// ---------------------------------------------------------------------------

/**
 * Reads a non-interlaced 8-bit PNG into straight RGBA.
 *
 * Only what the master actually is: colour type 6, bit depth 8, no interlacing. Anything
 * else throws rather than producing a quietly wrong image.
 */
function decodePng(buffer) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!signature.every((byte, index) => buffer[index] === byte)) throw new Error("not a PNG");

  let width = 0;
  let height = 0;
  const idat = [];

  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const body = buffer.subarray(offset + 8, offset + 8 + length);

    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      if (body[8] !== 8) throw new Error(`unsupported bit depth ${body[8]}`);
      if (body[9] !== 6) throw new Error(`unsupported colour type ${body[9]} (expected RGBA)`);
      if (body[12] !== 0) throw new Error("interlaced PNG is not supported");
    } else if (type === "IDAT") {
      idat.push(body);
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }

  const raw = inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = width * bpp;
  const out = Buffer.alloc(height * stride);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const current = out.subarray(y * stride, (y + 1) * stride);
    const above = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;

    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? current[x - bpp] : 0;
      const b = above ? above[x] : 0;
      const c = above && x >= bpp ? above[x - bpp] : 0;
      let value = line[x];

      switch (filter) {
        case 1: value += a; break;
        case 2: value += b; break;
        case 3: value += (a + b) >> 1; break;
        case 4: value += paeth(a, b, c); break;
        default: break;
      }
      current[x] = value & 0xff;
    }
  }

  return { width, height, data: out };
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

// ---------------------------------------------------------------------------
// resize
// ---------------------------------------------------------------------------

/** Box-filter downscale in premultiplied alpha space. */
function resize(source, size) {
  const { width: sw, height: sh, data: src } = source;
  const out = Buffer.alloc(size * size * 4);
  const scaleX = sw / size;
  const scaleY = sh / size;

  for (let dy = 0; dy < size; dy++) {
    const y0 = Math.floor(dy * scaleY);
    const y1 = Math.max(y0 + 1, Math.ceil((dy + 1) * scaleY));

    for (let dx = 0; dx < size; dx++) {
      const x0 = Math.floor(dx * scaleX);
      const x1 = Math.max(x0 + 1, Math.ceil((dx + 1) * scaleX));

      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let samples = 0;

      for (let sy = y0; sy < y1 && sy < sh; sy++) {
        for (let sx = x0; sx < x1 && sx < sw; sx++) {
          const at = (sy * sw + sx) * 4;
          const alpha = src[at + 3];
          r += src[at] * alpha;
          g += src[at + 1] * alpha;
          b += src[at + 2] * alpha;
          a += alpha;
          samples += 1;
        }
      }

      const at = (dy * size + dx) * 4;
      if (a === 0 || samples === 0) {
        out[at] = 0;
        out[at + 1] = 0;
        out[at + 2] = 0;
        out[at + 3] = 0;
        continue;
      }

      // Undo the premultiply. Averages land on whole numbers of alpha rarely enough that
      // clamping is the honest guard.
      out[at] = Math.min(255, Math.round(r / a));
      out[at + 1] = Math.min(255, Math.round(g / a));
      out[at + 2] = Math.min(255, Math.round(b / a));
      out[at + 3] = Math.round(a / samples);
    }
  }

  return { width: size, height: size, data: out };
}

// ---------------------------------------------------------------------------
// encode
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

function encodePng(image) {
  const { width, height, data } = image;
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    data.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/** ICO with PNG-compressed entries — understood by every OS Tauri ships to. */
function encodeIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  const directory = Buffer.alloc(16 * images.length);
  let offset = 6 + directory.length;
  const bodies = [];

  images.forEach((image, index) => {
    const at = index * 16;
    directory[at] = image.size >= 256 ? 0 : image.size;
    directory[at + 1] = image.size >= 256 ? 0 : image.size;
    directory.writeUInt16LE(1, at + 4); // colour planes
    directory.writeUInt16LE(32, at + 6); // bits per pixel
    directory.writeUInt32LE(image.data.length, at + 8);
    directory.writeUInt32LE(offset, at + 12);
    offset += image.data.length;
    bodies.push(image.data);
  });

  return Buffer.concat([header, directory, ...bodies]);
}

/** ICNS holding PNG entries, which macOS accepts from 10.11 onward. */
function encodeIcns(images) {
  const TYPES = { 16: "icp4", 32: "icp5", 64: "icp6", 128: "ic07", 256: "ic08", 512: "ic09", 1024: "ic10" };

  const chunks = images.map(({ size, data }) => {
    const head = Buffer.alloc(8);
    head.write(TYPES[size], 0, 4, "ascii");
    head.writeUInt32BE(data.length + 8, 4);
    return Buffer.concat([head, data]);
  });

  const body = Buffer.concat(chunks);
  const header = Buffer.alloc(8);
  header.write("icns", 0, 4, "ascii");
  header.writeUInt32BE(body.length + 8, 4);
  return Buffer.concat([header, body]);
}

// ---------------------------------------------------------------------------

mkdirSync(ICONS_DIR, { recursive: true });

const master = decodePng(readFileSync(MASTER));
console.log(`master: ${master.width}x${master.height}`);

const cache = new Map();
const scaled = (size) => {
  if (!cache.has(size)) cache.set(size, resize(master, size));
  return cache.get(size);
};
const pngOf = (size) => encodePng(scaled(size));

for (const [name, size] of [
  ["32x32.png", 32],
  ["128x128.png", 128],
  ["128x128@2x.png", 256],
  ["icon.png", 512],
]) {
  writeFileSync(join(ICONS_DIR, name), pngOf(size));
  console.log(`${name} (${size}px)`);
}

const icoSizes = [16, 32, 48, 64, 128, 256];
writeFileSync(
  join(ICONS_DIR, "icon.ico"),
  encodeIco(icoSizes.map((size) => ({ size, data: pngOf(size) }))),
);

const icnsSizes = [16, 32, 128, 256, 512, 1024];
writeFileSync(
  join(ICONS_DIR, "icon.icns"),
  encodeIcns(icnsSizes.map((size) => ({ size, data: pngOf(size) }))),
);

console.log(`icon.ico (${icoSizes.join(", ")})`);
console.log(`icon.icns (${icnsSizes.join(", ")})`);
