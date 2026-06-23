// Shared, pure Figma-JSON helpers used by both the scene generator and the IR
// builder. Keeping them in one place stops the two from drifting.

export const exportable = (n) => {
  if (n.visible === false) return false;
  const b = n.absoluteBoundingBox;
  if (b && (b.width < 1 || b.height < 1)) return false;
  return true;
};

export const area = (n) => {
  const b = n.absoluteBoundingBox;
  return b ? b.width * b.height : 0;
};

export const hex = (c) =>
  "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");

// Composite a stack of SOLID fills (Figma paints array index 0 = bottom, last =
// top) into one resolved colour, honouring per-fill opacity. Returns null if no
// solid fills.
export function compositeFills(fills) {
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

// Figma colour (with optional fill opacity) → CSS colour. Translucent paints
// keep their alpha so they don't occlude everything beneath them.
export const rgba = (c, op = 1) => {
  const a = (c.a === undefined ? 1 : c.a) * op;
  if (a >= 0.999) return hex(c);
  const to = (v) => Math.round(v * 255);
  return `rgba(${to(c.r)}, ${to(c.g)}, ${to(c.b)}, ${a.toFixed(3)})`;
};

// One Figma gradient paint → one CSS gradient. RADIAL honours the gradient
// handles ([center, radius-handle-1, radius-handle-2]) to emit a POSITIONED,
// SIZED ellipse. Without this, `radial-gradient(circle, …)` defaults to a
// full-bleed circle, so a localised sheen highlight is stretched across the
// whole element and washes it out. LINEAR derives its angle from the handles.
export function gradientCss(f) {
  const op = f.opacity === undefined ? 1 : f.opacity;
  const stops = (f.gradientStops || []).map((s) => `${rgba(s.color, op)} ${Math.round(s.position * 100)}%`).join(", ");
  const h = f.gradientHandlePositions;
  if (f.type === "GRADIENT_RADIAL") {
    if (!h || h.length < 3) return `radial-gradient(circle, ${stops})`;
    const [c, r1, r2] = h;
    const pct = (v) => Math.round(v * 100);
    const rx = Math.max(Math.abs(r1.x - c.x), Math.abs(r2.x - c.x));
    const ry = Math.max(Math.abs(r1.y - c.y), Math.abs(r2.y - c.y));
    return `radial-gradient(${pct(rx)}% ${pct(ry)}% at ${pct(c.x)}% ${pct(c.y)}%, ${stops})`;
  }
  const [p0, p1] = h || [{ x: 0, y: 0 }, { x: 0, y: 1 }];
  const ang = Math.round((Math.atan2(p1.x - p0.x, -(p1.y - p0.y)) * 180) / Math.PI);
  return `linear-gradient(${ang}deg, ${stops})`;
}

// Box normalised to a screen origin (ox, oy). Returns null when the node has no
// absolute box.
export const makeBox = (ox, oy) => (n) => {
  const b = n.absoluteBoundingBox;
  if (!b) return null;
  return { x: Math.round(b.x - ox), y: Math.round(b.y - oy), w: Math.round(b.width), h: Math.round(b.height) };
};

// Full text style for a TEXT node — everything needed to render overlay text
// identically to Figma's baked text. Colour is composited across all fills.
export function textStyle(node) {
  const st = node.style || {};
  const strokePaint = (node.strokes || []).find((x) => x.type === "SOLID" && x.visible !== false);
  return {
    fontFamily: st.fontFamily || null,
    fontPostScriptName: st.fontPostScriptName || null,
    fontStyle: st.fontStyle || null,
    fontWeight: st.fontWeight || 400,
    fontSize: Math.round(st.fontSize || 14),
    align: (st.textAlignHorizontal || "LEFT").toLowerCase(),
    alignVertical: (st.textAlignVertical || "TOP").toLowerCase(),
    letterSpacing: st.letterSpacing ? Math.round(st.letterSpacing * 100) / 100 : 0,
    lineHeight: st.lineHeightPx ? Math.round(st.lineHeightPx) : null,
    color: compositeFills(node.fills) || "#000",
    stroke:
      strokePaint && node.strokeWeight
        ? { color: hex(strokePaint.color), width: Math.round(node.strokeWeight * 100) / 100 }
        : null,
  };
}

// Per-character colour runs from Figma's characterStyleOverrides (index into
// styleOverrideTable; 0 = base). Returns null when the whole string is one
// colour (so single-colour text stays a plain string downstream).
export function textRuns(node) {
  const ov = node.characterStyleOverrides;
  if (!Array.isArray(ov) || !ov.length) return null;
  const tbl = node.styleOverrideTable || {};
  const chars = Array.from(node.characters || "");
  const colorAt = (i) => {
    const sid = ov[i] || 0;
    const fills = sid && tbl[sid] && tbl[sid].fills ? tbl[sid].fills : node.fills;
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

// Find a node by id OR name (sibling theme frames often share a name; an id is
// unambiguous).
export function findScreen(node, idOrName) {
  if (node.id === idOrName || node.name === idOrName) return node;
  for (const c of node.children || []) {
    const r = findScreen(c, idOrName);
    if (r) return r;
  }
  return null;
}
