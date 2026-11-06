// Generates the raster favicon set from public/favicon.svg.
// Run once after changing the mark: node scripts/icons.mjs
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';

const svg = await readFile('public/favicon.svg', 'utf8');
// Raster icons can't follow the color scheme, so they always use the light-mode tile.
const lightOnly = Buffer.from(svg.replace(/@media[\s\S]*?\}\s*\}/, ''));

const png = (size, padding = 0, flat = padding > 0) =>
  sharp(lightOnly, { density: 72 * (size / 32) * 2 })
    .resize(size - padding * 2, size - padding * 2)
    .extend({ top: padding, bottom: padding, left: padding, right: padding, background: '#14171c' })
    .flatten(flat ? { background: '#14171c' } : false)
    .png()
    .toBuffer();

await writeFile('public/apple-touch-icon.png', await png(180, 0, true));
await writeFile('public/icon-192.png', await png(192));
await writeFile('public/icon-512.png', await png(512));
// Maskable icon: keep the mark inside the 80% safe zone.
await writeFile('public/icon-maskable-512.png', await png(512, 52));

// favicon.ico: a single 32×32 PNG wrapped in an ICO container.
const ico32 = await png(32);
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // image count
header.writeUInt8(32, 6); // width
header.writeUInt8(32, 7); // height
header.writeUInt8(0, 8); // palette
header.writeUInt8(0, 9); // reserved
header.writeUInt16LE(1, 10); // color planes
header.writeUInt16LE(32, 12); // bits per pixel
header.writeUInt32LE(ico32.length, 14); // image size
header.writeUInt32LE(22, 18); // image offset
await writeFile('public/favicon.ico', Buffer.concat([header, ico32]));

console.log('Icons written to public/');
