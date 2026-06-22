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

// Dedup is by RENDERED CONTENT, not a guessed signature: render each candidate,
// hash the actual bytes, and collapse only byte-identical output. This makes
// dedup ground-truth — no name/area/colour/text heuristic can ever wrongly merge
// two visually-different assets (theme recolours, reward-grid cards, icon-only
// differences all stay distinct automatically). The plugin records every
// exported node in `manifest` (nodeId → asset path) so the generator never has
// to re-derive any signature.
const seenHash = new Map(); // contentHash → asset path
const manifest = {}; // nodeId → asset path (incl. deduped nodes → shared path)
const chromeSeen = new Map(); // contentHash → text-less chrome asset path
const chromeManifest = {}; // instanceId → chrome asset path (TEXT hidden)
const failures = []; // structured, identifiable: { id, name, type, box, fills, visible, reason }
const stats = { components: 0, instances: 0, decor: 0, grids: 0, images: 0, deduped: 0, chrome: 0, chromeDeduped: 0, failed: 0 };

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
function deepHasImage(node) {
  if (hasImageFill(node)) return true;
  return "children" in node ? node.children.some(deepHasImage) : false;
}
function area(node) {
  const b = node.absoluteBoundingBox;
  return b ? b.width * b.height : 0;
}
// A "grid panel" = a frame whose visual is a table: a pure stack of frames + text
// held together by per-side cell strokes (and 1–4% opacity fill bands). The
// generator CANNOT faithfully reconstruct that — horizontal separators are often
// sub-pixel fill steps, not strokes — so we render the whole table to ONE asset
// (crisp, exactly like Figma; same reason hand-built tables "just worked").
// Pure = no instances/components/images/vectors inside (those are their own
// exportables); GRID_MIN_CELLS partial-stroked descendants is the table signal.
const GRID_MIN_CELLS = 6;
function isPureGridSubtree(node) {
  let ok = true;
  (function rec(n) {
    if (!ok) return;
    if (n !== node) {
      const t = n.type;
      if (t === "INSTANCE" || t === "COMPONENT" || hasImageFill(n) || DECOR_TYPES.includes(t)) {
        ok = false;
        return;
      }
    }
    if ("children" in n) for (const c of n.children) rec(c);
  })(node);
  return ok;
}
// A "divider cell": visible strokes whose per-side weights are partial (some side
// 0, some > 0) — left-only / left+right etc. NOTE the live plugin API exposes
// per-side weights as strokeTopWeight/…/strokeLeftWeight (numbers); the REST
// JSON_REST_V1 export calls the same thing `individualStrokeWeights:{top,…}`.
// We must read the PLUGIN names here (this runs in-sandbox), keeping the REST
// shape as a fallback so the helper also works if reused on exported JSON.
function partialStroke(x) {
  if (!Array.isArray(x.strokes) || !x.strokes.some((s) => s.visible !== false)) return false;
  let sides;
  if (typeof x.strokeTopWeight === "number") {
    sides = [x.strokeTopWeight, x.strokeRightWeight, x.strokeBottomWeight, x.strokeLeftWeight];
  } else if (x.individualStrokeWeights) {
    const w = x.individualStrokeWeights;
    sides = [w.top, w.right, w.bottom, w.left];
  } else {
    return false;
  }
  return sides.some((w) => w > 0) && sides.some((w) => !w);
}
function countPartialStrokedCells(node) {
  let n = 0;
  (function rec(x) {
    if (x !== node && partialStroke(x)) n++;
    if ("children" in x) for (const c of x.children) rec(c);
  })(node);
  return n;
}
function isGridPanel(node) {
  if (node.type !== "FRAME" && node.type !== "GROUP") return false;
  return isPureGridSubtree(node) && countPartialStrokedCells(node) >= GRID_MIN_CELLS;
}
// djb2 — fast non-crypto hash for content dedup of the rendered bytes.
function hashStr(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

// Normalised SVG dedup key: strip random element ids + their references and
// sub-pixel coordinate jitter, so visually-identical SVGs (which differ only in
// that noise across exports) collapse to one file. Used ONLY for the dedup hash
// — the stored file is always the original SVG. Genuinely different art keeps
// its distinct geometry/colours and never collides.
function svgDedupKey(data) {
  return data
    .replace(/\sid="[^"]*"/g, "")
    .replace(/url\(#[^)]*\)/g, "url()")
    .replace(/(xlink:)?href="#[^"]*"/g, "")
    .replace(/-?\d+\.\d+/g, (m) => (+m).toFixed(1))
    .replace(/\s+/g, " ")
    .trim();
}

// Content-hash key for a rendered asset. SVGs hash their normalised form (above)
// so near-duplicates dedup; PNGs hash exact bytes.
function contentKey(r) {
  return r.ext + ":" + hashStr(r.ext === "svg" ? svgDedupKey(r.data) : r.data);
}

// Render a node WHOLE in its natural format (PNG if it contains a raster, else
// SVG); on failure fall back to the other format. Returns { kind, ext, data }.
async function renderWhole(node) {
  const raster = deepHasImage(node);
  const svg = async () => ({ kind: "text", ext: "svg", data: await node.exportAsync({ format: "SVG_STRING" }) });
  const png = async () => ({
    kind: "base64",
    ext: "png",
    data: figma.base64Encode(await node.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: PNG_SCALE } })),
  });
  try {
    return raster ? await png() : await svg();
  } catch (e) {
    return raster ? await svg() : await png();
  }
}

// Export a node whole, dedup by rendered-content hash, record it in `manifest`.
// `onNew` bumps the relevant stat only when a genuinely new asset is written.
async function emitWhole(node, files, onNew) {
  let r;
  try {
    r = await renderWhole(node);
  } catch (e) {
    recordFailure(node, e);
    return;
  }
  const h = contentKey(r);
  let path = seenHash.get(h);
  if (path) {
    stats.deduped++; // byte-identical to an already-exported asset
  } else {
    path = `${r.ext}/${safeName(node)}.${r.ext}`;
    files.push({ path, kind: r.kind, data: r.data });
    seenHash.set(h, path);
    onNew();
  }
  manifest[node.id] = path; // every exported node maps to its (shared) asset
}

// All visible TEXT descendants of a node (including inside nested instances).
function visibleTextDescendants(node) {
  const out = [];
  (function rec(n) {
    if (n.type === "TEXT" && n.visible !== false) out.push(n);
    if ("children" in n && n.children) n.children.forEach(rec);
  })(node);
  return out;
}

// Render a text-less "chrome" image of an instance (its TEXT hidden) so a
// downstream component can overlay live, data-driven text on a clean
// background. Best-effort + additive: on render failure, skip (the instance is
// simply absent from chrome.json — its full bake already succeeded, so we never
// pollute failed.json). ALWAYS restores visibility in `finally` — the document
// must never be left mutated.
async function exportChrome(node, files) {
  const texts = visibleTextDescendants(node);
  if (!texts.length) return; // qualifying rule: only text-bearing instances
  // Hide via opacity, NOT visibility: an opacity-0 node keeps its auto-layout
  // slot, so siblings (icons) don't reflow. visible=false removes it from the
  // layout flow and re-centers the rest (the button-coin bug).
  const prevOpacity = texts.map((t) => t.opacity);
  for (const t of texts) t.opacity = 0;
  try {
    const r = await renderWhole(node);
    const h = contentKey(r);
    let path = chromeSeen.get(h);
    if (path) {
      stats.chromeDeduped++;
    } else {
      path = `chrome/${safeName(node)}.${r.ext}`;
      files.push({ path, kind: r.kind, data: r.data });
      chromeSeen.set(h, path);
      stats.chrome++;
    }
    chromeManifest[node.id] = path;
  } catch (e) {
    // best-effort: leave this instance out of chrome.json
  } finally {
    texts.forEach((t, i) => (t.opacity = prevOpacity[i]));
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
    // Classify WHAT to export whole; dedup-by-content + the manifest live in
    // emitWhole. An instance is rendered WITH its overrides, so each distinct
    // card naturally gets its own asset (or shares one iff byte-identical).
    if (node.type === "COMPONENT") {
      await emitWhole(node, files, () => stats.components++);
      return; // whole — don't recurse
    }
    if (node.type === "INSTANCE") {
      await emitWhole(node, files, () => stats.instances++);
      // Additive: also render a text-less "chrome" variant so the instance can
      // become a data-driven component downstream. No-op if it has no text.
      await exportChrome(node, files);
      return; // whole — don't recurse
    }
    if (DECOR_TYPES.includes(node.type) && area(node) >= DECOR_MIN_AREA) {
      await emitWhole(node, files, () => stats.decor++);
      return; // decorative piece exported whole — don't dig into sub-vectors
    }
    if (hasImageFill(node)) {
      await emitWhole(node, files, () => stats.images++);
      return;
    }
    // Tables: bake the whole grid to one asset (see isGridPanel). Must precede
    // the descend below — once we recurse, the per-side / sub-opacity grid is
    // lost to cell-by-cell reconstruction.
    if (isGridPanel(node)) {
      await emitWhole(node, files, () => stats.grids++);
      return;
    }
    if ("children" in node) {
      for (const c of node.children) await walk(c, files);
    }
  } catch (e) {
    // The node was selected for export and threw — record it identifiably so the
    // bundle never silently loses a visual.
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
  // nodeId → asset path for every exported node. The generator reads this and
  // never re-derives a dedup key, so plugin and generator can't drift.
  files.push({ path: "manifest.json", kind: "text", data: JSON.stringify(manifest) });
  files.push({ path: "chrome.json", kind: "text", data: JSON.stringify(chromeManifest) });
  if (failures.length) {
    // Every asset that failed to export locally — node id (fetch via REST
    // images?ids=) + box + fills so simple fills can be reconstructed from JSON.
    files.push({ path: "failed.json", kind: "text", data: JSON.stringify(failures, null, 2) });
  }
  files.push({ path: "export-stats.json", kind: "text", data: JSON.stringify(stats, null, 2) });
  figma.ui.postMessage({ type: "done", files, count: files.length, stats });
}

run();
