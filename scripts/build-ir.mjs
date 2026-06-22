// Builds a semantic IR (intermediate representation) from a plugin export:
// a role-tagged tree (content | interactive | component | asset | layout) that
// downstream codegen consumes. No code emission here — pure analysis.
//
// Usage:
//   node scripts/build-ir.mjs <unpackedExportDir> "<screen id|name>" <out.json>

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { exportable, makeBox, findScreen, textStyle, textRuns } from "./lib/figma.mjs";

const INTERACTIVE_RE = /(button|btn|cta|tab|claim|submit|领取|立即|提交)/i;
const isContainer = (t) => t === "FRAME" || t === "GROUP" || t === "SECTION";

function layoutInfo(n) {
  if (!n.layoutMode || n.layoutMode === "NONE") return { mode: "absolute" };
  return {
    mode: "flex",
    direction: n.layoutMode === "HORIZONTAL" ? "row" : "column",
    gap: n.itemSpacing || 0,
    padding: {
      top: n.paddingTop || 0,
      right: n.paddingRight || 0,
      bottom: n.paddingBottom || 0,
      left: n.paddingLeft || 0,
    },
  };
}

function interactiveKind(name) {
  const s = (name || "").toLowerCase();
  if (/tab/.test(s)) return "tab";
  return "button";
}

function firstText(n) {
  let found = null;
  (function w(x) {
    if (found) return;
    if (x.type === "TEXT" && x.characters) { found = x.characters; return; }
    (x.children || []).forEach(w);
  })(n);
  return found;
}

export function buildIR(doc, screenIdOrName, manifest = {}) {
  const screen = findScreen(doc, screenIdOrName);
  if (!screen) return null;
  const ob = screen.absoluteBoundingBox;
  const box = makeBox(ob.x, ob.y);

  // Count componentId occurrences within the screen for instanceCount.
  const instanceCounts = {};
  (function count(n) {
    if (n.componentId) instanceCounts[n.componentId] = (instanceCounts[n.componentId] || 0) + 1;
    (n.children || []).forEach(count);
  })(screen);

  // Interactive only fires on instances/components or baked nodes (guard) so a
  // container whose name merely contains a keyword isn't treated as a button.
  const isInteractive = (n) =>
    INTERACTIVE_RE.test(n.name || "") &&
    (n.type === "INSTANCE" || n.type === "COMPONENT" || manifest[n.id]);

  const buildChildren = (n) => (n.children || []).map(build).filter(Boolean);

  function build(n) {
    if (!exportable(n)) return null;
    const b = box(n);
    if (!b) return null;
    const base = { id: n.id, name: n.name || n.type, box: b };
    const src = manifest[n.id];

    if (n.type === "TEXT") {
      return { ...base, role: "content", content: { text: n.characters || "", style: textStyle(n), runs: textRuns(n) } };
    }
    if (isInteractive(n)) {
      return {
        ...base, role: "interactive",
        interactive: { kind: interactiveKind(n.name), label: firstText(n) },
        ...(src ? { asset: { src } } : {}),
        children: buildChildren(n),
      };
    }
    if (n.type === "INSTANCE" || n.type === "COMPONENT") {
      return {
        ...base, role: "component",
        component: { key: n.componentId || n.id, instanceCount: instanceCounts[n.componentId] || 1 },
        ...(src ? { asset: { src } } : {}),
        children: buildChildren(n),
      };
    }
    if (src) {
      return { ...base, role: "asset", asset: { src } };
    }
    if (isContainer(n.type)) {
      return { ...base, role: "layout", layout: layoutInfo(n), children: buildChildren(n) };
    }
    return null; // decorative leaf, not baked — no contribution
  }

  const root = build(screen);
  const sb = box(screen);
  return { name: screenIdOrName, width: sb.w, height: sb.h, root };
}

// --- CLI ---
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("scripts/build-ir.mjs")) {
  const [, , exportDir, screenName, outPath] = process.argv;
  if (!exportDir || !screenName || !outPath) {
    console.error('usage: build-ir.mjs <exportDir> "<screen id|name>" <out.json>');
    process.exit(1);
  }
  const structDir = join(exportDir, "structure");
  const doc = JSON.parse(
    readFileSync(join(structDir, readdirSync(structDir).find((f) => f.endsWith(".json"))), "utf8"),
  ).document;
  const manifestPath = join(exportDir, "manifest.json");
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};
  const ir = buildIR(doc, screenName, manifest);
  if (!ir) { console.error("screen not found:", screenName); process.exit(1); }
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(ir, null, 2));
  const counts = {};
  (function tally(node) {
    counts[node.role] = (counts[node.role] || 0) + 1;
    (node.children || []).forEach(tally);
  })(ir.root);
  console.log(`IR: ${JSON.stringify(counts)} -> ${outPath}`);
}
