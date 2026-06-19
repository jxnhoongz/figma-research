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
const DECOR_MIN_AREA = 500; // skip sub-pixel vector noise; capture real decor.
const DECOR_TYPES = ["VECTOR", "BOOLEAN_OPERATION", "STAR", "LINE", "POLYGON", "ELLIPSE", "GROUP"];

const seen = new Set();
const errors = [];
const stats = { components: 0, instances: 0, decor: 0, images: 0, deduped: 0 };

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
      stats.components++;
      await exportWhole(node, files);
      return; // whole — don't recurse
    }
    if (node.type === "INSTANCE") {
      // Visual = its master (exported) + the structure JSON's overrides. Export
      // the first instance of each unique component (covers single-screen
      // exports too), dedupe the rest.
      const mc = node.mainComponent;
      if (!first("comp:" + (mc && mc.key ? mc.key : node.id))) return;
      stats.instances++;
      await exportWhole(node, files);
      return; // whole — don't recurse
    }
    if (DECOR_TYPES.includes(node.type) && area(node) >= DECOR_MIN_AREA) {
      const raster = deepHasImage(node);
      const key = raster
        ? "img:" + (firstImageRef(node) || node.id)
        : "decor:" + (node.name || node.type) + ":" + Math.round(area(node));
      if (!first(key)) return;
      stats.decor++;
      await exportWhole(node, files);
      return; // decorative piece exported whole — don't dig into sub-vectors
    }
    if (hasImageFill(node)) {
      if (!first("img:" + (firstImageRef(node) || node.id))) return;
      stats.images++;
      await exportPng(node, files);
      return;
    }
    if ("children" in node) {
      for (const c of node.children) await walk(c, files);
    }
  } catch (e) {
    const why = (e && (e.message || e.toString())) || String(e);
    errors.push(`${node.name || node.id} <${node.type}>: ${why}`);
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
  if (errors.length) files.push({ path: "errors.log", kind: "text", data: errors.join("\n") });
  files.push({ path: "export-stats.json", kind: "text", data: JSON.stringify(stats, null, 2) });
  figma.ui.postMessage({ type: "done", files, count: files.length, stats });
}

run();
