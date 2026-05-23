import { existsSync } from "node:fs";
import { resolve } from "node:path";

const iconSvg = resolve("docs/images/icon.svg");
const iconPng = resolve("dist/icon.png");
const exePath = resolve("minicode.exe");

if (!existsSync(exePath)) {
  console.log("⚠ minicode.exe not found, skipping icon embedding");
  process.exit(0);
}

if (!existsSync(iconSvg)) {
  console.log("⚠ docs/images/icon.svg not found, skipping icon embedding");
  process.exit(0);
}

console.log("Embedding icon...");

const sharp = (await import("sharp")).default;
await sharp(iconSvg, { density: 300 })
  .resize(256, 256)
  .png()
  .toFile(iconPng);
console.log("  ✓ SVG → PNG (256x256)");

const { rcedit } = await import("rcedit");
await rcedit(exePath, { icon: iconPng });
console.log("  ✓ Icon embedded in minicode.exe");
