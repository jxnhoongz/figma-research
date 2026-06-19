import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { MapPath } from '../svg'
import headerDeco from '../../assets/section2/decor/steps-header-deco.svg'

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
 *  1. Steps Header (1:982): the faint chevron decoration (`steps-header-deco`,
 *     the exported 1:989 "Steps Container" art) behind the centered 闯关排列
 *     title (display face, with the orange star burst 1:987).
 *  2. Steps List (1:1020): the real serpentine road (`MapPath`, the stacked
 *     Map pattern-bg tiles 1:1049+) as an absolute background, with the step
 *     Blocks overlapping it. Cards overlap each other by ~20px (Step Blocks at a
 *     ~70px pitch inside 60px rows) so the list reads as a continuous trail.
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
      {/* Steps Header (1:982): chevron decoration + 闯关排列 title. */}
      <div className="relative flex h-16 items-center justify-center">
        <img
          src={headerDeco}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 w-[300px] -translate-x-1/2 -translate-y-1/2 opacity-70"
        />
        <h2 className="font-display relative z-10 flex items-center gap-1 text-[22px] leading-none font-normal text-[#222222]">
          <span aria-hidden="true" className="text-step-star text-[26px] leading-none">
            ✦
          </span>
          {title}
        </h2>
      </div>

      {/* Steps List (1:1020): serpentine road behind the overlapping cards. */}
      <div className="relative -mt-5">
        {/* Real serpentine road tiles (Map pattern-bg), absolute background,
            inheriting the theme accent through currentColor. */}
        <MapPath
          aria-hidden="true"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 z-0 h-full w-full"
        />

        {/* Step Blocks. The negative inter-card margin reproduces Component 32's
            -20px gap so consecutive cards overlap. */}
        <ol className="relative z-10 flex flex-col [&>li:not(:first-child)]:-mt-2">
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
