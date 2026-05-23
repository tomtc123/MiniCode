/**
 * MiniCode Build Script
 *
 * 使用方法:
 *   npx tsx build.ts           # 打包成单个 JS 文件
 *   npx tsx build.ts --exe     # 打包成可执行文件 (需要 Node.js >= 20.12)
 */

import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";

const isExe = process.argv.includes("--exe");
const outDir = resolve("dist");

if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

console.log("🔨 Building MiniCode...\n");

// Step 1: Bundle with esbuild
console.log("1️⃣  Bundling with esbuild...");
try {
  execSync(
    [
      "npx esbuild src/index.tsx",
      "--bundle",
      "--platform=node",
      "--format=esm",
      "--outfile=dist/minicode.mjs",
      "--minify",
      "--external:node:*",
      "--external:assert",
      "--alias:react-devtools-core=./stubs/empty.js",
    ].join(" "),
    { stdio: "inherit" }
  );
  console.log("   ✓ Bundle created: dist/minicode.mjs\n");
} catch (err) {
  console.error("   ✗ Bundle failed:", err);
  process.exit(1);
}

if (!isExe) {
  console.log("✅ Done! Run with: node dist/minicode.mjs");
  console.log("\nTo build executable, run: npx tsx build.ts --exe");
  process.exit(0);
}

// Step 2: Create SEA config
console.log("2️⃣  Creating SEA config...");
const seaConfig = {
  main: "dist/minicode.mjs",
  output: "dist/sea-prep.blob",
  disableExperimentalSEAWarning: true,
};
writeFileSync(resolve("sea-config.json"), JSON.stringify(seaConfig, null, 2));
console.log("   ✓ sea-config.json created\n");

// Step 3: Generate blob
console.log("3️⃣  Generating SEA blob...");
try {
  execSync("node --experimental-sea-config sea-config.json", { stdio: "inherit" });
  console.log("   ✓ Blob generated\n");
} catch (err) {
  console.error("   ✗ Blob generation failed:", err);
  process.exit(1);
}

// Step 4: Create executable
console.log("4️⃣  Creating executable...");
const nodeExe = process.execPath;
const outExe = resolve("minicode.exe");

try {
  copyFileSync(nodeExe, outExe);
  console.log(`   ✓ Copied Node.js binary to ${outExe}\n`);
} catch (err) {
  console.error("   ✗ Failed to copy Node.js binary:", err);
  process.exit(1);
}

// Step 5: Inject blob (Windows only - Linux/Mac needs different approach)
console.log("5️⃣  Injecting SEA blob...");
try {
  execSync(
    `npx postject ${outExe} NODE_SEA_BLOB dist/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`,
    { stdio: "inherit" }
  );
  console.log(`   ✓ Blob injected\n`);
} catch (err) {
  console.error("   ✗ Injection failed:", err);
  console.log("\n   Try running manually:");
  console.log(`   npx postject ${outExe} NODE_SEA_BLOB dist/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`);
  process.exit(1);
}

// Step 6: Embed icon
console.log("6️⃣  Embedding icon...");
const iconSvg = resolve("docs/images/icon.svg");
const iconPng = resolve("dist/icon.png");

if (existsSync(iconSvg)) {
  try {
    const sharp = (await import("sharp")).default;
    await sharp(iconSvg, { density: 300 })
      .resize(256, 256)
      .png()
      .toFile(iconPng);
    console.log("   ✓ SVG → PNG (256x256)\n");

    const { rcedit } = await import("rcedit");
    await rcedit(outExe, { icon: iconPng });
    console.log("   ✓ Icon embedded in executable\n");
  } catch (err) {
    console.warn("   ⚠ Icon embedding skipped:", err);
  }
} else {
  console.log("   ⚠ docs/images/icon.svg not found, skipping icon\n");
}

console.log("✅ Done! Executable created:", outExe);
console.log("\nRun with: ./minicode.exe");
