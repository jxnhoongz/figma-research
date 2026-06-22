// Deterministic component emitter. Builds the IR in-process, selects the
// recurring component (a reward card), extracts shared slots + per-card data,
// and generates a presentational <RewardCard> + editable data + a <RewardGrid>.
// Overlay text renders via the shared PositionedText over the text-less chrome.
//
// Usage:
//   node scripts/emit-component.mjs <unpackedExportDir> "<screen id|name>" <outDir>

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { buildIR } from "./build-ir.mjs";

// --- pure core ---

function collect(node, role) {
  const out = [];
  (function w(n) {
    if (n.role === role) out.push(n);
    (n.children || []).forEach(w);
  })(node);
  return out;
}

// Classify a text value into a semantic field name, or null if it fits no class.
export function valueKey(text) {
  const t = (text || "").trim();
  if (/^[¥￥$]$/.test(t)) return "currency";
  if (/^\d[\d,]*$/.test(t)) return "amount";
  if (/\d\s*[万元][+＋]?$/.test(t)) return "requirement";
  return null;
}

// Field key for a content node: a valid-identifier layer name (≠ its text), else
// a value-based name, else positional — de-duped within the card via `used`.
export function fieldKey(name, text, i, used) {
  const s = (name || "").trim();
  const valid = /^[A-Za-z$_][A-Za-z0-9$_]*$/.test(s);
  const base = (valid && s !== text && s) || valueKey(text) || "text" + (i + 1);
  let key = base;
  let n = 2;
  while (used && used.has(key)) key = base + n++;
  if (used) used.add(key);
  return key;
}

// Keep only the style fields PositionedText consumes (drop alignVertical /
// fontPostScriptName / fontStyle residue from the IR).
function pickStyle(s) {
  return {
    fontFamily: s.fontFamily,
    fontSize: s.fontSize,
    fontWeight: s.fontWeight,
    color: s.color,
    align: s.align,
    lineHeight: s.lineHeight,
    letterSpacing: s.letterSpacing,
    stroke: s.stroke,
  };
}

// Key for a group slot: a valid-identifier layer name, else "group", de-duped.
function groupKey(name, used) {
  const s = (name || "").trim();
  const base = /^[A-Za-z$_][A-Za-z0-9$_]*$/.test(s) ? s : "group";
  let key = base;
  let n = 2;
  while (used.has(key)) key = base + n++;
  used.add(key);
  return key;
}

// Walk a component instance's IR subtree into a slot tree, preserving Figma
// auto-layout rows as flex `group` slots (so they grow and never overlap).
// A flex frame becomes a single flex `group` slot ONLY when every child is text.
// Such a leaf row (e.g. amount + ¥) is what the overlap fix needs: the row grows
// with the value so digits never collide. A flex frame with non-text children
// (an icon, a nested row) must NOT become a group — the emitter skips its
// non-text children, and a flex container would then collapse and re-stack the
// survivors from its top, pulling text off its real position. Those frames pass
// through so their children keep absolute, card-relative coordinates.
function isLeafTextRow(c) {
  return (
    c.role === "layout" &&
    c.layout &&
    c.layout.mode === "flex" &&
    (c.children || []).length > 0 &&
    (c.children || []).every((ch) => ch.role === "content")
  );
}

export function buildSlots(node, origin, used, ctr) {
  const slots = [];
  for (const c of node.children || []) {
    if (c.role === "content") {
      slots.push({
        kind: "text",
        key: fieldKey(c.name, c.content.text, ctr.i++, used),
        x: c.box.x - origin.x,
        y: c.box.y - origin.y,
        w: c.box.w,
        h: c.box.h,
        style: pickStyle(c.content.style),
      });
    } else if (isLeafTextRow(c)) {
      slots.push({
        kind: "group",
        key: groupKey(c.name, used),
        x: c.box.x - origin.x,
        y: c.box.y - origin.y,
        w: c.box.w,
        h: c.box.h,
        direction: c.layout.direction || "row",
        gap: c.layout.gap || 0,
        justify: c.layout.justify || "flex-start",
        align: c.layout.align || "baseline",
        children: buildSlots(c, origin, used, ctr),
      });
    } else if (c.role === "layout") {
      // non-flex OR flex-with-non-text-children → passthrough (absolute children)
      slots.push(...buildSlots(c, origin, used, ctr));
    }
    // nested asset/component → skip (chrome covers them)
  }
  return slots;
}

// "png/Card_1-5.png" -> "png-Card_1-5.png" (avoid basename collisions in one dir)
const flat = (p) => (p ? p.replace(/\//g, "-") : null);

export function extractComponent(ir, chrome = {}, manifest = {}) {
  const comps = collect(ir.root, "component");
  if (!comps.length) return null;
  const byKey = {};
  for (const c of comps) (byKey[c.component.key] = byKey[c.component.key] || []).push(c);
  const [key, instances] = Object.entries(byKey).sort((a, b) => b[1].length - a[1].length)[0];
  if (instances.length < 2) return null;

  const first = instances[0];
  const used = new Set();
  const slots = buildSlots(first, first.box, used, { i: 0 });

  // All text-slot keys in pre-order — the per-card field keys.
  const textKeys = [];
  (function w(ss) {
    for (const s of ss) {
      if (s.kind === "text") textKeys.push(s.key);
      else if (s.kind === "group") w(s.children);
    }
  })(slots);

  const items = instances.map((inst) => {
    const cs = collect(inst, "content"); // flat content, pre-order (same shape across instances)
    const fields = {};
    textKeys.forEach((k, i) => {
      fields[k] = cs[i] ? cs[i].content.text : "";
    });
    return {
      id: inst.id,
      bakedImage: flat(manifest[inst.id]) || null,
      chromeImage: flat(chrome[inst.id]) || null,
      fields,
    };
  });

  // Grid layout + its screen-relative box (FIRST layout node holding components).
  let grid = { gap: 0, padding: 0, width: null };
  let gridBox = null;
  let foundGrid = false;
  (function w(n) {
    if (foundGrid) return;
    if (
      n.role === "layout" &&
      (n.children || []).some((c) => c.role === "component" && c.component.key === key)
    ) {
      grid = { gap: n.layout?.gap || 0, padding: n.layout?.padding?.left || 0, width: n.box.w };
      gridBox = { x: n.box.x, y: n.box.y, w: n.box.w, h: n.box.h };
      foundGrid = true;
      return;
    }
    (n.children || []).forEach(w);
  })(ir.root);

  return { key, card: { w: first.box.w, h: first.box.h }, grid, gridBox, slots, items };
}

// --- codegen (deterministic string templates) ---

export function genRewardsTs(model) {
  const lines = model.items.map(
    (it) =>
      `  { id: ${JSON.stringify(it.id)}, bakedImage: ${JSON.stringify(it.bakedImage)}, ` +
      `chromeImage: ${JSON.stringify(it.chromeImage)}, fields: { ${Object.entries(it.fields).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(", ")} } },`,
  );
  // All slot keys (text + group), pre-order — for the inspector's position list.
  const keys = [];
  (function w(ss) {
    for (const s of ss) {
      keys.push(s.key);
      if (s.kind === "group") w(s.children);
    }
  })(model.slots);
  return `// GENERATED by scripts/emit-component.mjs — do not edit by hand.
export interface RewardItem {
  id: string
  bakedImage: string | null
  chromeImage: string | null
  fields: Record<string, string>
}

export const gridBox = ${JSON.stringify(model.gridBox || { x: 0, y: 0, w: 0, h: 0 })}

export const slotKeys: string[] = ${JSON.stringify(keys)}

export const rewards: RewardItem[] = [
${lines.join("\n")}
]
`;
}

export function genRewardCardTsx(model) {
  const slots = JSON.stringify(model.slots, null, 2).replace(/^/gm, "  ").trim();
  return `// GENERATED by scripts/emit-component.mjs — do not edit by hand.
import { PositionedText, textStyleCss } from '../../../components/PositionedText/PositionedText'

export const CARD_W = ${model.card.w}
export const CARD_H = ${model.card.h}

type TextSlot = { kind: 'text'; key: string; x: number; y: number; w: number; h: number; style: any }
type Slot =
  | TextSlot
  | {
      kind: 'group'
      key: string
      x: number
      y: number
      w: number
      h: number
      direction: 'row' | 'column'
      gap: number
      justify: string
      align: string
      children: TextSlot[]
    }

const SLOTS: Slot[] = ${slots}

type Overrides = Record<string, { x?: number; y?: number }>

function renderSlot(s: Slot, fields: Record<string, string>, ov: Overrides) {
  const o = ov[s.key] || {}
  const left = s.x + (o.x ?? 0)
  const top = s.y + (o.y ?? 0)
  if (s.kind === 'group') {
    // A leaf flex row positioned at its real card-relative spot. Width + justify
    // come from the Figma auto-layout frame, so the row centers in the card and
    // grows with the value (long numbers never overlap).
    return (
      <div
        key={s.key}
        style={{
          position: 'absolute',
          left,
          top,
          width: s.w,
          display: 'flex',
          flexDirection: s.direction,
          gap: s.gap,
          justifyContent: s.justify,
          alignItems: s.align,
        }}
      >
        {s.children.map((c) => (
          <span key={c.key} style={textStyleCss(c.style)}>
            {fields[c.key] ?? ''}
          </span>
        ))}
      </div>
    )
  }
  return (
    <PositionedText
      key={s.key}
      x={left}
      y={top}
      w={s.w}
      h={s.h}
      text={fields[s.key] ?? ''}
      runs={null}
      fontFamily={s.style.fontFamily}
      fontSize={s.style.fontSize}
      fontWeight={s.style.fontWeight}
      color={s.style.color}
      align={s.style.align}
      lineHeight={s.style.lineHeight}
      letterSpacing={s.style.letterSpacing}
      stroke={s.style.stroke}
    />
  )
}

export function RewardCard({
  chrome,
  fields,
  slotOverrides = {},
}: {
  chrome: string
  fields: Record<string, string>
  slotOverrides?: Overrides
}) {
  return (
    <div style={{ position: 'relative', width: CARD_W, height: CARD_H }}>
      <img src={chrome} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      {SLOTS.map((s) => renderSlot(s, fields, slotOverrides))}
    </div>
  )
}
`;
}

export function genRewardGridTsx(model) {
  return `// GENERATED by scripts/emit-component.mjs — do not edit by hand.
import { RewardCard } from './RewardCard'
import type { RewardItem } from './rewards'

export const GRID_GAP = ${model.grid.gap}
export const GRID_PADDING = ${model.grid.padding}
export const GRID_WIDTH = ${model.grid.width ?? "undefined"}

export function RewardGrid({
  items,
  assetUrl,
  slotOverrides,
}: {
  items: RewardItem[]
  assetUrl: (f: string) => string | undefined
  slotOverrides?: Record<string, { x?: number; y?: number }>
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: GRID_GAP, padding: GRID_PADDING, width: GRID_WIDTH }}>
      {items.map((r) => (
        <RewardCard key={r.id} chrome={(r.chromeImage && assetUrl(r.chromeImage)) || ''} fields={r.fields} slotOverrides={slotOverrides} />
      ))}
    </div>
  )
}
`;
}

// --- CLI ---
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("scripts/emit-component.mjs")) {
  const [, , exportDir, screen, outDir] = process.argv;
  if (!exportDir || !screen || !outDir) {
    console.error('usage: emit-component.mjs <exportDir> "<screen id|name>" <outDir>');
    process.exit(1);
  }
  const structDir = join(exportDir, "structure");
  const doc = JSON.parse(
    readFileSync(join(structDir, readdirSync(structDir).find((f) => f.endsWith(".json"))), "utf8"),
  ).document;
  const read = (f) => (existsSync(join(exportDir, f)) ? JSON.parse(readFileSync(join(exportDir, f), "utf8")) : {});
  const manifest = read("manifest.json");
  const chrome = read("chrome.json");
  const ir = buildIR(doc, screen, manifest);
  const model = extractComponent(ir, chrome, manifest);
  if (!model) {
    console.error("no recurring component (instanceCount >= 2) found");
    process.exit(1);
  }
  const imgDir = join(outDir, "img");
  mkdirSync(imgDir, { recursive: true });
  for (const it of model.items) {
    for (const [rel, flatName] of [
      [manifest[it.id], it.bakedImage],
      [chrome[it.id], it.chromeImage],
    ]) {
      if (rel && flatName) copyFileSync(join(exportDir, rel), join(imgDir, flatName));
    }
  }
  writeFileSync(join(outDir, "rewards.ts"), genRewardsTs(model));
  writeFileSync(join(outDir, "RewardCard.tsx"), genRewardCardTsx(model));
  writeFileSync(join(outDir, "RewardGrid.tsx"), genRewardGridTsx(model));
  console.log(`emitted ${model.items.length} cards, ${model.slots.length} slots -> ${outDir}`);
}
