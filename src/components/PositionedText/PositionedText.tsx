// Absolutely-positioned text box that renders Figma text faithfully: font stack,
// composited colour (or per-character runs), optional outline stroke, and a
// symmetric single-line slack so CJK labels don't mis-wrap. Shared by
// SceneRenderer (scene text) and generated components (card overlays).
export interface TextRun {
  text: string
  color: string
}
export interface PositionedTextProps {
  x: number
  y: number
  w: number
  h: number
  text: string
  runs?: TextRun[] | null
  fontFamily: string | null
  fontSize: number
  fontWeight: number
  color: string
  align: string
  lineHeight: number | null
  letterSpacing: number
  stroke?: { color: string; width: number } | null
}

const FONT_STACKS: Record<string, string> = {
  YouSheBiaoTiHei: '"YouSheBiaoTiHei", "PingFang SC", system-ui, sans-serif',
  'PingFang SC': '"PingFang SC", system-ui, sans-serif',
  'DIN Alternate': '"DIN Alternate", "PingFang SC", system-ui, sans-serif',
  'SF Pro': 'system-ui, -apple-system, sans-serif',
}
function fontStack(family: string | null): string | undefined {
  if (!family) return undefined
  return FONT_STACKS[family] ?? `"${family}", system-ui, sans-serif`
}

export function PositionedText(n: PositionedTextProps) {
  const slack = n.text.includes('\n') ? 0 : Math.ceil(n.fontSize * 0.6)
  return (
    <div
      data-testid="scene-text"
      style={{
        position: 'absolute',
        left: n.x - slack / 2,
        top: n.y,
        width: n.w + slack,
        fontFamily: fontStack(n.fontFamily),
        fontSize: n.fontSize,
        fontWeight: n.fontWeight,
        color: n.color,
        textAlign: n.align as 'left' | 'center' | 'right',
        lineHeight: n.lineHeight ? `${n.lineHeight}px` : undefined,
        letterSpacing: n.letterSpacing ? `${n.letterSpacing}px` : undefined,
        whiteSpace: 'pre-wrap',
        ...(n.stroke
          ? {
              WebkitTextStrokeColor: n.stroke.color,
              WebkitTextStrokeWidth: `${n.stroke.width}px`,
              paintOrder: 'stroke fill',
            }
          : {}),
      }}
    >
      {n.runs
        ? n.runs.map((r, j) => (
            <span key={j} style={{ color: r.color }}>
              {r.text}
            </span>
          ))
        : n.text}
    </div>
  )
}
