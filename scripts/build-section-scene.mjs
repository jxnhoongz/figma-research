// Reconstructs a single screen from a plugin export bundle as a flat, ordered
// "scene": every exported asset placed at its exact structure coordinate, plus
// independent text and container backgrounds. Positioning is correct by
// construction (we read Figma's absolute boxes), not by eyeballing.
//
// The plugin decides WHAT to export and dedups by RENDERED-CONTENT hash, then
// writes `manifest.json` (nodeId → asset path). This script just FOLLOWS that
// manifest — it never re-derives a dedup signature, so it can't drift from the
// plugin. A node in the manifest is whole-exported (place it, stop); otherwise
// it's a container we descend, painting loose text + rectangular fills.
//
// Usage:
//   node scripts/build-section-scene.mjs <unpackedExportDir> "<screenName|id>" <destAssetsDir> <sceneJsonPath>

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { exportable, hex, compositeFills, gradientCss, bgFromFills, makeBox, findScreen } from "./lib/figma.mjs";

const [, , exportDir, screenName, destAssets, scenePath] = process.argv;
if (!exportDir || !screenName || !destAssets || !scenePath) {
  console.error('usage: build-section-scene.mjs <exportDir> "<screenName|id>" <destAssets> <scenePath>');
  process.exit(1);
}

const structDir = join(exportDir, "structure");
const structFile = join(structDir, readdirSync(structDir).find((f) => f.endsWith(".json")));
const doc = JSON.parse(readFileSync(structFile, "utf8")).document;

// nodeId → asset path ("svg/foo.svg" | "png/bar.png"), authored by the plugin.
const manifestPath = join(exportDir, "manifest.json");
if (!existsSync(manifestPath)) {
  console.error("manifest.json not found — re-export with the current plugin (content-hash + manifest).");
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
// Nodes the plugin tried to export but that threw — stop there, don't recurse
// (avoids painting wrong child rects under a failed asset).
const failedSet = new Set(
  existsSync(join(exportDir, "failed.json"))
    ? JSON.parse(readFileSync(join(exportDir, "failed.json"), "utf8")).map((f) => f.id)
    : [],
);

// Only these node types are faithfully representable as a CSS rect background.
// Never approximate an ellipse / boolean / vector with a rect (that turns a
// circle into a square, a "+" union into crossing bars) — those are SVG assets.
const RECT_BG_TYPES = ["RECTANGLE", "FRAME", "COMPONENT", "INSTANCE", "SECTION"];

// A frame's SOLID stroke becomes a CSS border — this is how table grid lines are
// encoded. CRITICAL: honour `individualStrokeWeights` (per-side widths). Table
// cells stroke only the sides that form shared dividers (e.g. left-only, or
// left+right), so a uniform 4-side border would box every cell and double up on
// shared edges — the classic "weird grid". The renderer uses border-box so a
// sub-pixel line doesn't inflate the cell.
function borderFromStrokes(n) {
  const s = (Array.isArray(n.strokes) ? n.strokes : []).find((x) => x.type === "SOLID" && x.visible !== false);
  if (!s) return null;
  const round = (w) => Math.round((w || 0) * 100) / 100;
  const isw = n.individualStrokeWeights;
  const sides = isw
    ? { top: round(isw.top), right: round(isw.right), bottom: round(isw.bottom), left: round(isw.left) }
    : (() => {
        const w = round(n.strokeWeight);
        return { top: w, right: w, bottom: w, left: w };
      })();
  if (!sides.top && !sides.right && !sides.bottom && !sides.left) return null;
  return { color: hex(s.color), ...sides };
}

// Split a TEXT node into coloured runs from Figma's per-character overrides
// (characterStyleOverrides indexes into styleOverrideTable; 0 = base style).
// Two-tone titles like 活动[详情] layer an accent fill on only some characters;
// reading node.fills[0] alone flattens them. Returns null when every character
// resolves to the same colour (so single-colour text stays a plain string).
function textRuns(n) {
  const ov = n.characterStyleOverrides;
  if (!Array.isArray(ov) || !ov.length) return null;
  const tbl = n.styleOverrideTable || {};
  const chars = Array.from(n.characters || "");
  const colorAt = (i) => {
    const sid = ov[i] || 0;
    const fills = sid && tbl[sid] && tbl[sid].fills ? tbl[sid].fills : n.fills;
    return compositeFills(fills) || "#000";
  };
  const runs = [];
  for (let i = 0; i < chars.length; i++) {
    const c = colorAt(i);
    const last = runs[runs.length - 1];
    if (last && last.color === c) last.text += chars[i];
    else runs.push({ text: chars[i], color: c });
  }
  return new Set(runs.map((r) => r.color)).size > 1 ? runs : null;
}

// Find the screen frame and normalise to its top-left. Matches by node id OR
// name — sibling theme frames often share a name, so an id ("1:32192") is the
// unambiguous way to pick one variant.
const screen = findScreen(doc, screenName);
if (!screen) {
  console.error("screen not found:", screenName);
  process.exit(1);
}
const ox = screen.absoluteBoundingBox.x, oy = screen.absoluteBoundingBox.y;
const box = makeBox(ox, oy);

// Ordered walk of the SCREEN → flat scene nodes (paint order).
const scene = [];
const usedAssets = new Map(); // srcFile -> destName
const missing = [];

function placeAsset(n) {
  const rel = manifest[n.id]; // e.g. "svg/Foo_1-23.svg"
  const src = join(exportDir, rel);
  if (!existsSync(src)) {
    missing.push({ id: n.id, name: n.name, type: n.type, ...box(n) });
    return;
  }
  const dest = basename(rel);
  usedAssets.set(src, dest);
  scene.push({ kind: "img", src: dest, ...box(n) });
}

function emitText(n) {
  const st = n.style || {};
  // Text stroke (e.g. 活动详情's white outline). strokeAlign is usually OUTSIDE;
  // the renderer paints it behind the fill so the glyph stays crisp.
  const strokePaint = (n.strokes || []).find((x) => x.type === "SOLID" && x.visible !== false);
  const stroke =
    strokePaint && n.strokeWeight
      ? { color: hex(strokePaint.color), width: Math.round(n.strokeWeight * 100) / 100 }
      : null;
  scene.push({
    kind: "text",
    ...box(n),
    text: n.characters || "",
    fontFamily: st.fontFamily || null,
    fontSize: Math.round(st.fontSize || 14),
    fontWeight: st.fontWeight || 400,
    color: compositeFills(n.fills) || "#000",
    runs: textRuns(n), // per-character colour runs (two-tone titles); null if uniform
    align: (st.textAlignHorizontal || "LEFT").toLowerCase(),
    alignVertical: (st.textAlignVertical || "TOP").toLowerCase(),
    lineHeight: st.lineHeightPx ? Math.round(st.lineHeightPx) : null,
    letterSpacing: st.letterSpacing ? Math.round(st.letterSpacing * 100) / 100 : 0,
    stroke,
  });
}

function walk(n) {
  if (!exportable(n)) return;
  if (n.type === "COMPONENT_SET") return n.children?.forEach(walk);
  if (!box(n)) return n.children?.forEach(walk); // no renderable box; descend

  if (manifest[n.id]) {
    placeAsset(n); // whole-exported (incl. baked text/overrides) — stop here
    return;
  }
  if (failedSet.has(n.id)) return; // plugin tried + failed; leave a gap, don't recurse
  if (n.type === "TEXT") return emitText(n);

  // Container we descend through: paint its own fill + border first (only when a
  // rect is geometrically faithful), then its children.
  if (RECT_BG_TYPES.includes(n.type)) {
    const bg = bgFromFills(n);
    const border = borderFromStrokes(n);
    if (bg || border) scene.push({ kind: "rect", ...box(n), ...(bg || {}), border, radius: n.cornerRadius || 0 });
  }
  n.children?.forEach(walk);
}
walk(screen);

// Copy used assets.
mkdirSync(destAssets, { recursive: true });
for (const [src, dest] of usedAssets) copyFileSync(src, join(destAssets, dest));

mkdirSync(dirname(scenePath), { recursive: true });
writeFileSync(
  scenePath,
  JSON.stringify({ name: screenName, width: box(screen).w, height: box(screen).h, nodes: scene }, null, 2),
);

const counts = scene.reduce((a, n) => ((a[n.kind] = (a[n.kind] || 0) + 1), a), {});
console.log(`scene: ${JSON.stringify(counts)} | assets copied: ${usedAssets.size} | missing: ${missing.length}`);
if (missing.length) console.log("MISSING (in manifest but no file — re-export):", JSON.stringify(missing, null, 2));
