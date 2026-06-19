// Section2 Exporter — runs in the Figma PLUGIN sandbox (local, no REST API, no
// token, no rate limit). Exports the structured manifest (JSON_REST_V1, same
// shape as the REST /nodes endpoint) PLUS every asset, classified SVG vs PNG.
// Sends the bundle to the UI iframe, which downloads it as one JSON file.

figma.showUI(__html__, { width: 360, height: 260 });

function safeName(node) {
  const base = (node.name || node.type || "node")
    .trim()
    .replace(/[^\w.\-一-鿿]+/g, "_")
    .slice(0, 60);
  return `${base}_${node.id.replace(/[:;]/g, "-")}`;
}

function hasImageFill(node) {
  const fills = node.fills;
  return Array.isArray(fills) && fills.some((f) => f.type === "IMAGE");
}

// A node is "raster" for our purposes if it (or any descendant) paints a photo.
function deepHasImage(node) {
  if (hasImageFill(node)) return true;
  if ("children" in node) return node.children.some(deepHasImage);
  return false;
}

async function exportSvg(node, files) {
  const svg = await node.exportAsync({ format: "SVG_STRING" });
  files.push({ path: `svg/${safeName(node)}.svg`, kind: "text", data: svg });
}

async function exportPng(node, files) {
  const png = await node.exportAsync({
    format: "PNG",
    constraint: { type: "SCALE", value: 3 },
  });
  files.push({ path: `png/${safeName(node)}.png`, kind: "base64", data: figma.base64Encode(png) });
}

const errors = [];

// Decorative vector art (leaf patterns, title graphics, stars, ribbons) lives in
// plain GROUP/VECTOR nodes, not components — capture those too, whole.
const DECOR_TYPES = ["VECTOR", "BOOLEAN_OPERATION", "STAR", "LINE", "POLYGON", "ELLIPSE", "GROUP"];

// Walk: component SETs fan out to their variants; each COMPONENT exports whole
// (PNG if photo, else SVG); image-fill nodes → PNG; significant decorative
// vector/group art → SVG (exported whole, not dug into).
async function walk(node, files) {
  try {
    if (node.type === "COMPONENT_SET") {
      for (const c of node.children) await walk(c, files);
      return;
    }
    if (node.type === "COMPONENT") {
      if (deepHasImage(node)) await exportPng(node, files);
      else await exportSvg(node, files);
      return; // keep the component whole — don't dig into its vectors
    }
    if (hasImageFill(node)) {
      await exportPng(node, files);
      return;
    }
    if (DECOR_TYPES.includes(node.type)) {
      const b = node.absoluteBoundingBox;
      if (b && b.width * b.height >= 500) {
        await exportSvg(node, files);
        return; // decorative piece exported whole — don't dig into sub-vectors
      }
    }
    if ("children" in node) {
      for (const c of node.children) await walk(c, files);
    }
  } catch (e) {
    errors.push(`${node.name || node.id}: ${e.message}`);
  }
}

async function run() {
  const sel = figma.currentPage.selection;
  if (!sel.length) {
    figma.ui.postMessage({ type: "error", msg: "Select a frame / section / component set first, then run again." });
    return;
  }
  const files = [];
  for (const root of sel) {
    figma.ui.postMessage({ type: "log", msg: `Exporting "${root.name}"…` });
    // (a) structured manifest — identical shape to REST /v1/files/:key/nodes
    try {
      const json = await root.exportAsync({ format: "JSON_REST_V1" });
      files.push({ path: `structure/${safeName(root)}.json`, kind: "text", data: JSON.stringify(json) });
    } catch (e) {
      figma.ui.postMessage({ type: "log", msg: "JSON_REST_V1 failed: " + e.message });
    }
    // (b) assets
    await walk(root, files);
  }
  if (errors.length) {
    files.push({ path: "errors.log", kind: "text", data: errors.join("\n") });
  }
  figma.ui.postMessage({ type: "done", files, count: files.length });
}

run();
