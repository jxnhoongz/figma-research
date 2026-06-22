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

export function gradientCss(f) {
  const stops = (f.gradientStops || []).map((s) => `${hex(s.color)} ${Math.round(s.position * 100)}%`).join(", ");
  if (f.type === "GRADIENT_RADIAL") return `radial-gradient(circle, ${stops})`;
  const [p0, p1] = f.gradientHandlePositions || [{ x: 0, y: 0 }, { x: 0, y: 1 }];
  const ang = Math.round((Math.atan2(p1.x - p0.x, -(p1.y - p0.y)) * 180) / Math.PI);
  return `linear-gradient(${ang}deg, ${stops})`;
}

export function bgFromFills(n) {
  const f = (Array.isArray(n.fills) ? n.fills : []).find((x) => x.visible !== false && x.type !== "IMAGE");
  if (!f) return null;
  if (f.type === "SOLID") return { bg: hex(f.color), opacity: f.opacity ?? 1 };
  if (f.type.startsWith("GRADIENT")) return { bg: gradientCss(f), opacity: f.opacity ?? 1 };
  return null;
}

// Box normalised to a screen origin (ox, oy). Returns null when the node has no
// absolute box.
export const makeBox = (ox, oy) => (n) => {
  const b = n.absoluteBoundingBox;
  if (!b) return null;
  return { x: Math.round(b.x - ox), y: Math.round(b.y - oy), w: Math.round(b.width), h: Math.round(b.height) };
};

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
