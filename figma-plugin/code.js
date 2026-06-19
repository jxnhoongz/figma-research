// Figma Section Exporter — runs in the Figma PLUGIN sandbox (local: no REST API,
// no token, no rate limit). For the selected node(s) it produces ONE bundle that
// contains everything needed to replicate ANY screen inside the selection:
//
//   • structure/  — JSON_REST_V1 of each selected root (full tree, same shape as
//                   the REST /nodes endpoint: positions, sizes, layout, z-order,
//                   text styles, fills, component/instance refs)
//   • svg/, png/  — every asset, classified + DEDUPED:
//       - component masters        → whole (PNG if raster, else SVG), once per key
//       - instances                → deduped to their master component
//       - decorative groups/vectors→ whole (PNG if raster, else SVG)
//       - standalone image fills   → PNG, once per imageRef
//
// Dedup makes a whole-section export efficient: 6 themed screens no longer emit
// 6× the same asset. Export the WHOLE SECTION once; replicate any screen from it.

figma.showUI(__html__, { width: 380, height: 300 });

const PNG_SCALE = 2; // 2× retina — crisp enough for 1:1, half the bytes of 3×.
// Capture real decor down to small icons (step dots, +/- markers, list bullets).
// 500 (≈22×22) was far too aggressive and dropped legitimate small art; the true
// sub-pixel-noise guard is exportable() (rejects <1px). 16 = 4×4 keeps real icons
// (e.g. a 5×5 "+" union) while still skipping degenerate specks.
const DECOR_MIN_AREA = 16;
const DECOR_TYPES = ["VECTOR", "BOOLEAN_OPERATION", "STAR", "LINE", "POLYGON", "ELLIPSE", "GROUP"];

const seen = new Set();
const failures = []; // structured, identifiable: { id, name, type, box, fills, visible, reason }
const stats = { components: 0, instances: 0, decor: 0, images: 0, deduped: 0, failed: 0 };

// Record an export failure with everything needed to identify and backfill the
// node later (by id, via the REST images endpoint, or by reconstructing simple
// fills from the structure JSON). Figma export errors often carry no .message,
// so we synthesise a real one instead of logging "undefined".
function recordFailure(node, e) {
  const b = node.absoluteBoundingBox;
  failures.push({
    id: node.id,
    name: node.name || null,
    type: node.type,
    box: b ? { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) } : null,
    fills: Array.isArray(node.fills) ? node.fills.map((f) => f.type) : [],
    visible: node.visible !== false,
    reason: (e && (e.message || e.name)) || String(e) || "exportAsync threw with no message (likely an unrenderable mask/boolean node)",
  });
}

function safeName(node) {
  const base = (node.name || node.type || "node").trim().replace(/[^\w.\-一-鿿]+/g, "_").slice(0, 60);
  return `${base}_${node.id.replace(/[:;]/g, "-")}`;
}
function hasImageFill(node) {
  return Array.isArray(node.fills) && node.fills.some((f) => f.type === "IMAGE");
}
function firstImageRef(node) {
  const f = (Array.isArray(node.fills) ? node.fills : []).find((x) => x.type === "IMAGE" && x.imageHash);
  return f ? f.imageHash : null;
}
function deepHasImage(node) {
  if (hasImageFill(node)) return true;
  return "children" in node ? node.children.some(deepHasImage) : false;
}
function area(node) {
  const b = node.absoluteBoundingBox;
  return b ? b.width * b.height : 0;
}
// Color-aware dedup signature. Decor that is IDENTICAL across themes (a white
// moon) shares a signature and still dedups; decor that RECOLORS per theme (the
// bottom panel, wheel wedges) gets a distinct signature so every theme keeps its
// own asset instead of collapsing to the first theme's colour. Order-independent
// (sorted set) so it matches the generator's reading of the structure JSON.
function hashStr(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
function colorHex(c) {
  return [c.r, c.g, c.b].map((v) => Math.round(v * 255)).join(",");
}
function colorSig(node) {
  const set = new Set();
  const add = (paints) => {
    if (!Array.isArray(paints)) return; // figma.mixed / undefined
    for (const p of paints) {
      if (p.visible === false) continue;
      if (p.type === "SOLID") set.add(colorHex(p.color));
      else if (p.gradientStops) for (const s of p.gradientStops) set.add(colorHex(s.color));
    }
  };
  (function walk(n) {
    add(n.fills);
    add(n.strokes);
    if ("children" in n && n.children) n.children.forEach(walk);
  })(node);
  return hashStr([...set].sort().join(","));
}
// Once-only guard. Returns false if this key was already exported.
function first(key) {
  if (seen.has(key)) { stats.deduped++; return false; }
  seen.add(key);
  return true;
}

async function exportSvg(node, files) {
  files.push({ path: `svg/${safeName(node)}.svg`, kind: "text", data: await node.exportAsync({ format: "SVG_STRING" }) });
}
async function exportPng(node, files) {
  const png = await node.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: PNG_SCALE } });
  files.push({ path: `png/${safeName(node)}.png`, kind: "base64", data: figma.base64Encode(png) });
}
// Export the node whole; if the preferred format fails, fall back to the other.
async function exportWhole(node, files) {
  try {
    if (deepHasImage(node)) await exportPng(node, files);
    else await exportSvg(node, files);
  } catch (e) {
    if (deepHasImage(node)) await exportSvg(node, files);
    else await exportPng(node, files);
  }
}

function exportable(node) {
  // Hidden layers and zero-area nodes can't be rendered — exportAsync throws.
  if (node.visible === false) return false;
  const b = node.absoluteBoundingBox;
  if (b && (b.width < 1 || b.height < 1)) return false;
  return true;
}

async function walk(node, files) {
  try {
    if (!exportable(node)) return; // skip hidden / zero-size subtrees
    if (node.type === "COMPONENT_SET") {
      for (const c of node.children) await walk(c, files); // fan out to variants
      return;
    }
    if (node.type === "COMPONENT") {
      if (!first("comp:" + (node.key || node.id))) return;
      await exportWhole(node, files); // count only on success — throws skip the ++
      stats.components++;
      return; // whole — don't recurse
    }
    if (node.type === "INSTANCE") {
      // Visual = its master (exported) + the structure JSON's overrides. Export
      // the first instance of each unique component (covers single-screen
      // exports too), dedupe the rest.
      const mc = node.mainComponent;
      if (!first("comp:" + (mc && mc.key ? mc.key : node.id))) return;
      await exportWhole(node, files);
      stats.instances++;
      return; // whole — don't recurse
    }
    if (DECOR_TYPES.includes(node.type) && area(node) >= DECOR_MIN_AREA) {
      const raster = deepHasImage(node);
      const key = raster
        ? "img:" + (firstImageRef(node) || node.id)
        : "decor:" + (node.name || node.type) + ":" + Math.round(area(node)) + ":" + colorSig(node);
      if (!first(key)) return;
      await exportWhole(node, files);
      stats.decor++;
      return; // decorative piece exported whole — don't dig into sub-vectors
    }
    if (hasImageFill(node)) {
      if (!first("img:" + (firstImageRef(node) || node.id))) return;
      await exportPng(node, files);
      stats.images++;
      return;
    }
    if ("children" in node) {
      for (const c of node.children) await walk(c, files);
    }
  } catch (e) {
    // The node was selected for export and threw — record it identifiably so the
    // bundle never silently loses a visual. seen[] already holds its dedup key,
    // so a guaranteed-fail node isn't retried for every duplicate.
    recordFailure(node, e);
  }
}

async function run() {
  const sel = figma.currentPage.selection;
  if (!sel.length) {
    figma.ui.postMessage({ type: "error", msg: "Select a section / screen / frame first, then run again." });
    return;
  }
  const files = [];
  for (const root of sel) {
    figma.ui.postMessage({ type: "log", msg: `Exporting "${root.name}"…` });
    try {
      files.push({
        path: `structure/${safeName(root)}.json`,
        kind: "text",
        data: JSON.stringify(await root.exportAsync({ format: "JSON_REST_V1" })),
      });
    } catch (e) {
      figma.ui.postMessage({ type: "log", msg: "JSON_REST_V1 failed: " + e.message });
    }
    await walk(root, files);
  }
  stats.failed = failures.length;
  if (failures.length) {
    // Machine-readable manifest of every asset that failed to export locally.
    // Each entry has the node id (fetch via REST images?ids=) plus box+fills so
    // simple gradient/solid/mask nodes can be reconstructed straight from JSON.
    files.push({ path: "failed.json", kind: "text", data: JSON.stringify(failures, null, 2) });
  }
  files.push({ path: "export-stats.json", kind: "text", data: JSON.stringify(stats, null, 2) });
  figma.ui.postMessage({ type: "done", files, count: files.length, stats });
}

run();
