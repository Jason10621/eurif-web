/**
 * ULIF PWA 아이콘 생성.  실행:  node scripts/gen-icons.mjs
 * → public/{icon-192,icon-512,icon-maskable-512,apple-touch-icon}.png + favicon
 */
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const pub = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

// moon + star mark on an indigo ground (matches lucide MoonStar used in the app)
const mark = (s, pad = 0) => {
  const scale = (s - pad * 2) / 24;
  const tx = pad + (s - pad * 2) * 0.02;
  const ty = pad;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" rx="${s * 0.22}" fill="#2a78d6"/>
  <g transform="translate(${tx} ${ty}) scale(${scale})" fill="none" stroke="#ffffff"
     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 5h4"/><path d="M20 3v4"/>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
  </g>
</svg>`;
};

const targets = [
  ["icon-192.png", 192, 0],
  ["icon-512.png", 512, 0],
  ["icon-maskable-512.png", 512, 512 * 0.12],
  ["apple-touch-icon.png", 180, 0],
];

for (const [name, size, pad] of targets) {
  await sharp(Buffer.from(mark(size, pad))).png().toFile(join(pub, name));
  console.log("✔", name);
}
await sharp(Buffer.from(mark(64))).resize(64, 64).png().toFile(join(pub, "favicon.png"));
console.log("✔ favicon.png");
