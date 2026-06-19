import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { MapPath } from '../svg'
import { SectionHeader } from '../SectionHeader/SectionHeader'

interface StepsContainerProps {
  /** Header label (Figma node 1:988 = 闯关排列). */
  title: string
  /** The step blocks, overlaid on the serpentine road. */
  children: ReactNode
  /** The claim CTA rendered below the last step (Figma 1:1186). */
  footer?: ReactNode
  className?: string
}

/**
 * Mirrors Figma "Component 32" (the 闯关排列 module) at the EXACT measured
 * nesting from the screen structure JSON — no guessed widths. The container
 * chain 362 → 346 → 322 → 306 → 245 is what stops the cards from cramping:
 *
 *   Component 32       362×440  VERTICAL gap -20  pad T8/B8  CLIP  counter CENTER
 *    ├ Steps Header (闯关排列 SectionHeader)        ← gap -20: title tucks DOWN
 *    │                                                over the Steps List by 20px
 *    └ Steps List     346       HORIZONTAL pad L12/R12  CLIP at 364 tall
 *       ├ pattern (leaf decoration)               ← absolute background layer
 *       └ Step Wrapper 322       position:relative
 *          ├ Overlay Container 306  pad T20/B20    → map (behind) + steps (front)
 *          │   ├ Background Content (MapPath serpentine, absolute BEHIND)
 *          │   └ Overlay Content 306  VERTICAL gap 10  pad T8/B8  counter CENTER
 *          │       └ Step Block 306×60  (×N, ~5 visible via the 364px clip)
 *          └ Claim Button Container 345×70          ← footer, bottom of wrapper
 *
 * The ONLY negative spacing is Component 32's -20 (title↔list overlap). Step
 * blocks themselves are spaced at gap 10 and never overlap each other.
 *
 * This frame is NOT a registered Figma component, so it was missing from the
 * component-master extraction — modeled here from the screen structure.
 */
export function StepsContainer({
  title,
  children,
  footer,
  className,
}: StepsContainerProps) {
  return (
    // Component 32: 362 wide, pad T8/B8, CLIP. The accent tile (leaf-dot
    // pattern) with the vertical -20 title↔list overlap.
    <div
      data-testid="steps-container"
      className={cn(
        'bg-pattern-leaf relative mx-auto w-[362px] max-w-full overflow-hidden py-2',
        className,
      )}
    >
      {/* Steps Header: shared star + underline + 闯关排列 title, centered. */}
      <div className="relative z-10 flex items-center justify-center">
        <SectionHeader title={title} />
      </div>

      {/* Steps List: 346 wide, pad L12/R12, clipped at 364 tall. The -20 margin
          is Component 32's title↔list overlap (NOT card↔card overlap). */}
      <div className="relative mx-auto -mt-5 w-[346px] max-w-full overflow-hidden px-3">
        {/* Step Wrapper: 322 wide, the relative positioning context. */}
        <div className="relative mx-auto w-[322px] max-w-full">
          {/* Overlay Container: 306 wide, pad T20/B20. Holds the serpentine
              road (absolute, behind) and the step list (in front). */}
          <div className="relative mx-auto w-[306px] max-w-full py-5">
            {/* Background Content: the real serpentine road (Map pattern-bg
                tiles), absolute behind, themed via currentColor. */}
            <MapPath
              aria-hidden="true"
              className="pointer-events-none absolute top-7 left-1/2 z-0 w-[306px] -translate-x-1/2"
            />

            {/* Overlay Content: 306 wide, vertical gap 10, pad T8/B8, counter
                CENTER. The step blocks — spaced, NOT overlapping. */}
            <ol className="relative z-10 flex flex-col items-center gap-2.5 py-2">
              {children}
            </ol>
          </div>

          {/* Claim Button Container 345×70 — bottom of the Step Wrapper. */}
          {footer ? (
            <div className="relative z-10 flex justify-center pb-1">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
