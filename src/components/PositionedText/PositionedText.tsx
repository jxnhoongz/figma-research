// Absolutely-positioned text box that renders Figma text faithfully: font stack,
// composited colour (or per-character runs), optional outline stroke, and a
// symmetric single-line slack so CJK labels don't mis-wrap. Shared by
// SceneRenderer (scene text) and generated components (card overlays).
import type React from 'react'

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

// The font/colour/stroke CSS for Figma text (no positioning) — shared by
// PositionedText and generated flex-group spans so both render identically.
export function textStyleCss(s: {
  fontFamily: string | null
  fontSize: number
  fontWeight: number
  color: string
  letterSpacing: number
  stroke?: { color: string; width: number } | null
}): React.CSSProperties {
  return {
    fontFamily: fontStack(s.fontFamily),
    fontSize: s.fontSize,
    fontWeight: s.fontWeight,
    color: s.color,
    letterSpacing: s.letterSpacing ? `${s.letterSpacing}px` : undefined,
    whiteSpace: 'pre',
    ...(s.stroke
      ? {
          WebkitTextStrokeColor: s.stroke.color,
          WebkitTextStrokeWidth: `${s.stroke.width}px`,
          paintOrder: 'stroke fill',
        }
      : {}),
  }
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
        ...textStyleCss(n),
        textAlign: n.align as 'left' | 'center' | 'right',
        lineHeight: n.lineHeight ? `${n.lineHeight}px` : undefined,
        whiteSpace: 'pre-wrap',
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
