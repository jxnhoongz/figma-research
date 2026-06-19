// Reconstructs a single screen from a plugin export bundle as a flat, ordered
// "scene": every whole-exported asset placed at its exact structure coordinate,
// plus independent text and container backgrounds. Positioning is correct by
// construction (we read Figma's absolute boxes), not by eyeballing.
//
// Why this works: the exporter emits one deduped asset per unique component /
// decor / image, and STOPS descending there. So a screen is just those assets
// tiled at each occurrence's position, in document (paint) order, with loose
// text + frame fills overlaid. We replay the SAME classification here to map
// every on-screen occurrence back to its asset file.
//
// Usage:
//   node scripts/build-section-scene.mjs <unpackedExportDir> "<screenName>" <destAssetsDir> <sceneJsonPath>

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";

const [, , exportDir, screenName, destAssets, scenePath] = process.argv;
if (!exportDir || !screenName || !destAssets || !scenePath) {
  console.error('usage: build-section-scene.mjs <exportDir> "<screenName>" <destAssets> <scenePath>');
  process.exit(1);
}

const structDir = join(exportDir, "structure");
const structFile = join(structDir, readdirSync(structDir).find((f) => f.endsWith(".json")));
const root = JSON.parse(readFileSync(structFile, "utf8"));
const doc = root.document;
const components = root.components || {};

const DECOR_TYPES = ["VECTOR", "BOOLEAN_OPERATION", "STAR", "LINE", "POLYGON", "ELLIPSE", "GROUP"];
const DECOR_MIN_AREA = 16; // keep in sync with figma-plugin/code.js
// Only these node types are faithfully representable as a CSS rect background.
// Never approximate an ellipse / boolean / vector with a rect (that turns a
// circle into a square, a "+" union into crossing bars, etc.) — those must come
// through as exported SVG assets.
const RECT_BG_TYPES = ["RECTANGLE", "FRAME", "COMPONENT", "INSTANCE", "SECTION"];

const safeName = (n) => {
  const base = (n.name || n.type || "node").trim().replace(/[^\w.\-一-鿿]+/g, "_").slice(0, 60);
  return `${base}_${n.id.replace(/[:;]/g, "-")}`;
};
const hasImageFill = (n) => Array.isArray(n.fills) && n.fills.some((f) => f.type === "IMAGE");
const firstImageRef = (n) => {
  const f = (Array.isArray(n.fills) ? n.fills : []).find((x) => x.type === "IMAGE" && x.imageRef);
  return f ? f.imageRef : null;
};
const deepHasImage = (n) => hasImageFill(n) || (n.children ? n.children.some(deepHasImage) : false);
const area = (n) => {
  const b = n.absoluteBoundingBox;
  return b ? b.width * b.height : 0;
};
const exportable = (n) => {
  if (n.visible === false) return false;
  const b = n.absoluteBoundingBox;
  if (b && (b.width < 1 || b.height < 1)) return false;
  return true;
};

// Color-aware dedup signature — MUST stay byte-identical to figma-plugin/code.js
// so we resolve the same asset filename the plugin emitted.
function hashStr(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
const colorTriplet = (c) => [c.r, c.g, c.b].map((v) => Math.round(v * 255)).join(",");
function colorSig(node) {
  const set = new Set();
  const add = (paints) => {
    if (!Array.isArray(paints)) return;
    for (const p of paints) {
      if (p.visible === false) continue;
      if (p.type === "SOLID") set.add(colorTriplet(p.color));
      else if (p.gradientStops) for (const s of p.gradientStops) set.add(colorTriplet(s.color));
    }
  };
  (function walk(n) {
    add(n.fills);
    add(n.strokes);
    if (n.children) n.children.forEach(walk);
  })(node);
  return hashStr([...set].sort().join(","));
}

// Dedup key — must match the plugin so we resolve the right asset filename.
function dedupKey(n) {
  if (n.type === "COMPONENT") return "comp:" + (components[n.id]?.key || n.id);
  if (n.type === "INSTANCE") return "comp:" + (components[n.componentId]?.key || n.id);
  if (DECOR_TYPES.includes(n.type) && area(n) >= DECOR_MIN_AREA) {
    return deepHasImage(n)
      ? "img:" + (firstImageRef(n) || n.id)
      : "decor:" + (n.name || n.type) + ":" + Math.round(area(n)) + ":" + colorSig(n);
  }
  if (hasImageFill(n)) return "img:" + (firstImageRef(n) || n.id);
  return null;
}

// Pass 1: walk the WHOLE doc to learn which node's safeName became each key's
// asset file (first occurrence wins, exactly like the plugin's `first()`).
const keyToStem = new Map();
(function learn(n) {
  if (!exportable(n)) return;
  if (n.type === "COMPONENT_SET") return n.children?.forEach(learn);
  const key = dedupKey(n);
  if (key) {
    if (!keyToStem.has(key)) keyToStem.set(key, safeName(n));
    return; // whole-export — stop (matches plugin)
  }
  n.children?.forEach(learn);
})(doc);

// Resolve a key to an on-disk asset file (svg or png).
const have = new Map(); // stem -> {file, ext}
for (const dir of ["svg", "png"]) {
  const d = join(exportDir, dir);
  if (!existsSync(d)) continue;
  for (const f of readdirSync(d)) have.set(f.replace(/\.(svg|png)$/, ""), { file: join(d, f), ext: f.split(".").pop() });
}

// --- fill → CSS helpers ---
const hex = (c) => "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");

// Composite a stack of SOLID fills (Figma paints array index 0 = bottom, last =
// top) into one resolved colour, honouring per-fill opacity. Text frequently
// layers a colour fill + a translucent black overlay; picking just the first
// fill renders it too bright. Returns null if no solid fills.
function compositeFills(fills) {
  const solids = (fills || []).filter((f) => f.type === "SOLID" && f.visible !== false);
  if (!solids.length) return null;
  let r = 0, g = 0, b = 0, a = 0;
  for (const f of solids) {
    const sa = f.opacity === undefined ? 1 : f.opacity;
    const na = sa + a * (1 - sa);
    if (na > 0) {
      r = (f.color.r * sa + r * a * (1 - sa)) / na;
      g = (f.color.g * sa + g * a * (1 - sa)) / na;
      b = (f.color.b * sa + b * a * (1 - sa)) / na;
    }
    a = na;
  }
  const to = (v) => Math.round(v * 255);
  if (a >= 0.999) return hex({ r, g, b });
  return `rgba(${to(r)}, ${to(g)}, ${to(b)}, ${a.toFixed(3)})`;
}
function gradientCss(f) {
  const stops = (f.gradientStops || []).map((s) => `${hex(s.color)} ${Math.round(s.position * 100)}%`).join(", ");
  if (f.type === "GRADIENT_RADIAL") return `radial-gradient(circle, ${stops})`;
  const [p0, p1] = f.gradientHandlePositions || [{ x: 0, y: 0 }, { x: 0, y: 1 }];
  const ang = Math.round((Math.atan2(p1.x - p0.x, -(p1.y - p0.y)) * 180) / Math.PI);
  return `linear-gradient(${ang}deg, ${stops})`;
}
function bgFromFills(n) {
  const f = (Array.isArray(n.fills) ? n.fills : []).find((x) => x.visible !== false && x.type !== "IMAGE");
  if (!f) return null;
  if (f.type === "SOLID") return { bg: hex(f.color), opacity: f.opacity ?? 1 };
  if (f.type.startsWith("GRADIENT")) return { bg: gradientCss(f), opacity: f.opacity ?? 1 };
  return null;
}

// Find the screen frame and normalise to its top-left.
const screen = (function find(n) {
  if (n.name === screenName) return n;
  for (const c of n.children || []) {
    const r = find(c);
    if (r) return r;
  }
  return null;
})(doc);
if (!screen) {
  console.error("screen not found:", screenName);
  process.exit(1);
}
const ox = screen.absoluteBoundingBox.x, oy = screen.absoluteBoundingBox.y;
const box = (n) => {
  const b = n.absoluteBoundingBox;
  if (!b) return null;
  return { x: Math.round(b.x - ox), y: Math.round(b.y - oy), w: Math.round(b.width), h: Math.round(b.height) };
};

// Pass 2: ordered walk of the SCREEN → flat scene nodes (paint order).
const scene = [];
const usedFiles = new Map(); // file -> destName
const missing = [];

function placeAsset(n, key) {
  const stem = keyToStem.get(key);
  const asset = stem && have.get(stem);
  if (!asset) {
    missing.push({ id: n.id, name: n.name, type: n.type, ...box(n) });
    return false;
  }
  const dest = `${basename(asset.file)}`;
  usedFiles.set(asset.file, dest);
  scene.push({ kind: "img", src: dest, ...box(n) });
  return true;
}

function walk(n) {
  if (!exportable(n)) return;
  if (n.type === "COMPONENT_SET") return n.children?.forEach(walk);
  if (!box(n)) return n.children?.forEach(walk); // no renderable box; descend for children

  if (n.type === "TEXT") {
    const b = box(n);
    const st = n.style || {};
    // Captured text stroke (e.g. 活动详情's white outline). Figma strokeAlign is
    // usually OUTSIDE; we render it behind the fill via paint-order in the
    // renderer, so the visible weight ≈ strokeWeight.
    const strokePaint = (n.strokes || []).find((x) => x.type === "SOLID" && x.visible !== false);
    const stroke =
      strokePaint && n.strokeWeight
        ? { color: hex(strokePaint.color), width: Math.round(n.strokeWeight * 100) / 100 }
        : null;
    scene.push({
      kind: "text",
      ...b,
      text: n.characters || "",
      fontFamily: st.fontFamily || null,
      fontSize: Math.round(st.fontSize || 14),
      fontWeight: st.fontWeight || 400,
      color: compositeFills(n.fills) || "#000",
      align: (st.textAlignHorizontal || "LEFT").toLowerCase(),
      alignVertical: (st.textAlignVertical || "TOP").toLowerCase(),
      lineHeight: st.lineHeightPx ? Math.round(st.lineHeightPx) : null,
      letterSpacing: st.letterSpacing ? Math.round(st.letterSpacing * 100) / 100 : 0,
      stroke,
    });
    return;
  }

  const key = dedupKey(n);
  if (key) {
    placeAsset(n, key);
    return; // whole-exported — its subtree (incl. baked text) is in the asset
  }

  // Container we descend through: paint its own fill first (only when a rect is
  // geometrically faithful), then its children.
  if (RECT_BG_TYPES.includes(n.type)) {
    const bg = bgFromFills(n);
    if (bg) scene.push({ kind: "rect", ...box(n), ...bg, radius: n.cornerRadius || 0 });
  }
  n.children?.forEach(walk);
}
walk(screen);

// Copy used assets.
mkdirSync(destAssets, { recursive: true });
for (const [src, dest] of usedFiles) copyFileSync(src, join(destAssets, dest));

mkdirSync(dirname(scenePath), { recursive: true });
writeFileSync(scenePath, JSON.stringify({ name: screenName, width: box(screen).w, height: box(screen).h, nodes: scene }, null, 2));

const counts = scene.reduce((a, n) => ((a[n.kind] = (a[n.kind] || 0) + 1), a), {});
console.log(`scene: ${JSON.stringify(counts)} | assets copied: ${usedFiles.size} | missing: ${missing.length}`);
if (missing.length) console.log("MISSING (reconstruct from JSON / re-export):", JSON.stringify(missing, null, 2));
