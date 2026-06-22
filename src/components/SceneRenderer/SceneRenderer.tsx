import { cn } from '../../lib/cn'
import { PositionedText } from '../PositionedText/PositionedText'

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
  bg?: string
  opacity?: number
  radius?: number
  /** Frame stroke → per-side CSS border widths (table grid lines / dividers). */
  border?: { color: string; top: number; right: number; bottom: number; left: number } | null
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
  /** Per-character colour runs (two-tone titles). Falls back to `color`. */
  runs?: { text: string; color: string }[] | null
  align: string
  alignVertical?: string
  lineHeight: number | null
  letterSpacing: number
  stroke?: { color: string; width: number } | null
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
                background: n.bg || undefined,
                opacity: n.opacity ?? 1,
                borderRadius: n.radius || undefined,
                // Per-side widths (Figma individualStrokeWeights) so cells draw
                // only their shared dividers, not a full box. border-box keeps
                // the line inside the cell so the grid geometry doesn't shift.
                ...(n.border
                  ? {
                      borderStyle: 'solid' as const,
                      borderColor: n.border.color,
                      borderTopWidth: n.border.top,
                      borderRightWidth: n.border.right,
                      borderBottomWidth: n.border.bottom,
                      borderLeftWidth: n.border.left,
                      boxSizing: 'border-box' as const,
                    }
                  : {}),
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
        return (
          <PositionedText
            key={i}
            x={n.x}
            y={n.y}
            w={n.w}
            h={n.h}
            text={n.text}
            runs={n.runs}
            fontFamily={n.fontFamily}
            fontSize={n.fontSize}
            fontWeight={n.fontWeight}
            color={n.color}
            align={n.align}
            lineHeight={n.lineHeight}
            letterSpacing={n.letterSpacing}
            stroke={n.stroke}
          />
        )
      })}
    </div>
  )
}
