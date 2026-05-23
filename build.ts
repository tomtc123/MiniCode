/**
 * MiniCode Build Script
 *
 * 使用方法:
 *   npx tsx build.ts           # 打包成单个 JS 文件 (esbuild)
 *   npx tsx build.ts --exe     # 打包成可执行文件 (bun compile)
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const isExe = process.argv.includes("--exe");

console.log("🔨 Building MiniCode...\n");

if (!isExe) {
  // Bundle with esbuild for Node.js
  console.log("📦 Bundling with esbuild...");
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
  } catch {
    console.error("\n❌ Bundle failed");
    process.exit(1);
  }
  console.log("\n✅ Done! Run with: node dist/minicode.mjs");
  console.log("\nTo build executable, run: npx tsx build.ts --exe");
  process.exit(0);
}

// Build standalone executable with bun
console.log("🔧 Compiling with bun...");

const iconFlag = existsSync("docs/images/icon.ico")
  ? "--windows-icon=docs/images/icon.ico"
  : "";

try {
  execSync(
    [
      "bun build src/index.tsx",
      "--compile",
      "--outfile=MiniCode.exe",
      iconFlag,
      '--windows-title="MiniCode"',
      '--windows-description="MiniCode"',
      '--windows-publisher="MiniCode"',
      '--windows-version="1.0.0"',
      '--windows-copyright="Copyright 2026"',
    ]
      .filter(Boolean)
      .join(" "),
    { stdio: "inherit" }
  );
} catch {
  console.error("\n❌ Compile failed");
  process.exit(1);
}

console.log("\n✅ Done! Executable created: MiniCode.exe");
