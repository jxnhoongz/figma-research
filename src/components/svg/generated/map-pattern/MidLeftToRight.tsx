// DERIVED (mirror-approximation) — not a real Figma export.
// The Figma serpentine uses a "Mid-left to right" lane (componentId 1:6041)
// that is the horizontal mirror of "Mid-right to left" (1:6038). No SVG was
// exported for it, so we approximate it by flipping <MidRightToLeft> on the X
// axis. Replace with the real export when section2 asset quota frees up.
import type { SVGProps } from 'react'
import { MidRightToLeft } from './MidRightToLeft'

export function MidLeftToRight(props: SVGProps<SVGSVGElement>) {
  const { style, ...rest } = props
  return (
    <MidRightToLeft
      {...rest}
      style={{ ...style, transform: 'scaleX(-1)', transformOrigin: 'center' }}
    />
  )
}
