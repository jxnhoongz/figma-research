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
 * Mirrors Figma "Component 32" (node 1:981) — the 闯关排列 module. It is a flat
 * tile of the theme accent (with the decorative leaf-dot `pattern`, 1:1021),
 * laid out vertically with a NEGATIVE 20px gap so the header and the step list
 * tuck together (`Component 32` itemSpacing -20).
 *
 * Two parts:
 *  1. Steps Header (1:982): the shared `SectionHeader` (Star 25 + 闯关排列 title +
 *     Vector 2723 underline, node 1:985) — IDENTICAL treatment to 活动详情.
 *  2. Steps List (1:1020): the real serpentine road (`MapPath`, the stacked
 *     Map pattern-bg tiles 1:1049+) as an absolute background, with the step
 *     Blocks laid out at `gap 10` (Overlay Content node 1:1057 itemSpacing 10) —
 *     they do NOT overlap each other. The only negative spacing is on Component
 *     32 (itemSpacing -20): the title tucks down over the steps top by ~20px.
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
    <div
      data-testid="steps-container"
      className={cn(
        'bg-pattern-leaf relative overflow-hidden px-3 pt-2 pb-2',
        className,
      )}
    >
      {/* Steps Header (1:982): shared star + underline + 闯关排列 title. */}
      <div className="relative z-10 flex h-16 items-center justify-center">
        <SectionHeader title={title} />
      </div>

      {/* Steps List (1:1020): serpentine road behind the spaced cards. The -20
          margin is Component 32's title↔list overlap (NOT card↔card overlap). */}
      <div className="relative -mt-5">
        {/* Real serpentine road tiles (Map pattern-bg), absolute background,
            inheriting the theme accent through currentColor. */}
        <MapPath
          aria-hidden="true"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 z-0 h-full w-full"
        />

        {/* Step Blocks at gap 10 (Overlay Content 1:1057 itemSpacing 10): cards
            are SPACED, they do not overlap each other. */}
        <ol className="relative z-10 flex flex-col gap-2.5">
          {children}
        </ol>

        {footer ? (
          <div className="relative z-10 mt-1 flex justify-center pb-1">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
