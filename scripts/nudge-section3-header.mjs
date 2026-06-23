// Manual, deliberate deviation from Figma (user-requested): the 当前活动时间 header
// has a decorative star layered OVER the heading's first character. Figma draws it
// that way on purpose, so the replicate skill correctly leaves it — but for the
// section-3 themes we choose to nudge the occluding star LEFT so the heading reads
// cleanly. Deterministic + idempotent so the same adjustment applies to every
// theme's scene (run it after build-section-scene).
//
// Usage: node scripts/nudge-section3-header.mjs <scene.json>
import { readFileSync, writeFileSync } from "node:fs";

const [, , scenePath] = process.argv;
if (!scenePath) {
  console.error("usage: nudge-section3-header.mjs <scene.json>");
  process.exit(2);
}

const scene = JSON.parse(readFileSync(scenePath, "utf8"));
const nodes = scene.nodes || [];
const ti = nodes.findIndex((n) => n.kind === "text" && (n.text || "").includes("当前活动时间"));
if (ti < 0) {
  console.log(`no 当前活动时间 header in ${scenePath} — nothing to nudge`);
  process.exit(0);
}

const T = nodes[ti];
const GAP = 3; // px of clearance between the decoration and the heading
let moved = 0;

// Shift any decoration that (a) is painted AFTER the heading (so it occludes it),
// (b) sits in the same header band, and (c) overlaps the heading's LEFT edge,
// leftwards until its right edge clears the heading.
for (let i = ti + 1; i < nodes.length; i++) {
  const N = nodes[i];
  if (N.kind !== "img" && N.kind !== "rect") continue;
  const sameBand = Math.abs(N.y - T.y) < 40;
  const onLeft = N.x < T.x + 30;
  const overlapsText = N.x + N.w > T.x && N.x < T.x + T.w;
  if (sameBand && onLeft && overlapsText) {
    const shift = N.x + N.w - (T.x - GAP);
    if (shift > 0) {
      N.x = Math.round(N.x - shift);
      moved++;
    }
  }
}

writeFileSync(scenePath, JSON.stringify(scene, null, 2));
console.log(`nudged ${moved} occluding decoration(s) off the 当前活动时间 header in ${scenePath}`);
