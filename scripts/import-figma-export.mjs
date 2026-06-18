// Unpacks the figma-export.json produced by the Section2 Exporter plugin into
// real files on disk. The plugin (Figma Plugin API) is the unlimited "door";
// this just writes what it handed us — no Figma API calls here.
//
// Usage:
//   node scripts/import-figma-export.mjs <path-to-figma-export.json> [destDir]
// Default destDir: figma-export/

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const src = process.argv[2];
const dest = resolve(process.argv[3] || "figma-export");

if (!src) {
  console.error("usage: node scripts/import-figma-export.mjs <figma-export.json> [destDir]");
  process.exit(1);
}

const { files, generatedAt } = JSON.parse(readFileSync(src, "utf8"));
if (!Array.isArray(files)) {
  console.error("Invalid export: no `files` array. Is this the plugin's figma-export.json?");
  process.exit(1);
}

let svg = 0,
  png = 0,
  other = 0;
for (const f of files) {
  const out = join(dest, f.path);
  mkdirSync(dirname(out), { recursive: true });
  if (f.kind === "base64") {
    writeFileSync(out, Buffer.from(f.data, "base64"));
    png++;
  } else {
    writeFileSync(out, f.data, "utf8");
    f.path.endsWith(".svg") ? svg++ : other++;
  }
}

console.log(
  `wrote ${files.length} files to ${dest}  (${svg} svg, ${png} png, ${other} other)` +
    (generatedAt ? `\nexported ${new Date(generatedAt).toISOString()}` : ""),
);
