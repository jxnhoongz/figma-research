import { cn } from '../../lib/cn'

/**
 * Generic, data-driven renderer for a "scene" produced by
 * `scripts/build-section-scene.mjs`. Each node carries an absolute box (in the
 * screen's own coordinate space) so the screen is reconstructed 1:1 from the
 * real Figma coordinates — no hand-positioning. Array order is paint order
 * (later nodes stack on top), matching the document walk.
 */
export interface SceneRectNode {
  kind: 'rect'
  x: number
  y: number
  w: number
  h: number
  bg: string
  opacity?: number
  radius?: number
}
export interface SceneImgNode {
  kind: 'img'
  x: number
  y: number
  w: number
  h: number
  src: string
}
export interface SceneTextNode {
  kind: 'text'
  x: number
  y: number
  w: number
  h: number
  text: string
  fontFamily: string | null
  fontSize: number
  fontWeight: number
  color: string
  align: string
  alignVertical?: string
  lineHeight: number | null
  letterSpacing: number
  stroke?: { color: string; width: number } | null
}

// Figma font family → CSS stack. The first entry is the exact face (loaded via
// @font-face in index.css when it isn't a system font); the rest are fallbacks
// so size/weight/colour still land if the face is unavailable.
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
export type SceneNode = SceneRectNode | SceneImgNode | SceneTextNode

export interface Scene {
  name: string
  width: number
  height: number
  nodes: SceneNode[]
}

export function SceneRenderer({
  scene,
  assetUrl,
  className,
}: {
  scene: Scene
  /** Resolves a scene `src` filename to a bundled URL. */
  assetUrl: (src: string) => string | undefined
  className?: string
}) {
  return (
    <div
      data-testid="scene"
      className={cn('relative overflow-hidden', className)}
      style={{ width: scene.width, height: scene.height }}
    >
      {scene.nodes.map((n, i) => {
        const pos = { position: 'absolute' as const, left: n.x, top: n.y }
        if (n.kind === 'rect') {
          return (
            <div
              key={i}
              aria-hidden="true"
              style={{
                ...pos,
                width: n.w,
                height: n.h,
                background: n.bg,
                opacity: n.opacity ?? 1,
                borderRadius: n.radius || undefined,
              }}
            />
          )
        }
        if (n.kind === 'img') {
          const url = assetUrl(n.src)
          if (!url) return null
          return (
            <img
              key={i}
              src={url}
              alt=""
              aria-hidden="true"
              style={{ ...pos, width: n.w, height: n.h }}
            />
          )
        }
        // Our system font renders a hair wider than Figma's measured box, which
        // wraps tight single-line labels (活动详情 → 活动详/情). Add symmetric
        // slack so the box keeps its centre but stops mis-wrapping; real
        // multi-line copy (contains \n) keeps its exact width.
        const slack = n.text.includes('\n') ? 0 : Math.ceil(n.fontSize * 0.6)
        return (
          <div
            key={i}
            data-testid="scene-text"
            style={{
              ...pos,
              left: n.x - slack / 2,
              width: n.w + slack,
              fontFamily: fontStack(n.fontFamily),
              fontSize: n.fontSize,
              fontWeight: n.fontWeight,
              color: n.color,
              textAlign: n.align as 'left' | 'center' | 'right',
              lineHeight: n.lineHeight ? `${n.lineHeight}px` : undefined,
              letterSpacing: n.letterSpacing ? `${n.letterSpacing}px` : undefined,
              whiteSpace: 'pre-wrap',
              // Text outline (e.g. 活动详情's white stroke). paint-order keeps the
              // stroke behind the fill so the glyph shape stays crisp.
              ...(n.stroke
                ? {
                    WebkitTextStrokeColor: n.stroke.color,
                    WebkitTextStrokeWidth: `${n.stroke.width}px`,
                    paintOrder: 'stroke fill',
                  }
                : {}),
            }}
          >
            {n.text}
          </div>
        )
      })}
    </div>
  )
}
