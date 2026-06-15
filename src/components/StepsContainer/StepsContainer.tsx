import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { AllPieces } from '../svg'

interface StepsContainerProps {
  /** Pill header label (Figma "等级可领" text = 闯关排列). */
  title: string
  /** The step cards, rendered on top of the serpentine map path. */
  children: ReactNode
  className?: string
}

/**
 * 闯关排列 container — Figma "Steps List" frame (1:1020). A frosted white box
 * (3px translucent-white border, 20px radius) that wraps ALL step cards. Inside
 * it the real serpentine map path (`AllPieces`, the start+mid+mid+end composite)
 * is an absolute BACKGROUND layer; the cards overlay it in front, overlapping
 * the path. The "闯关排列" pill is the frame header, straddling the top edge.
 *
 * This frame is NOT a registered Figma component (it's a plain copy-pasted
 * frame), so it was missing from the component-master extraction — captured here
 * from the actual screen structure. Purely presentational.
 */
export function StepsContainer({ title, children, className }: StepsContainerProps) {
  return (
    <div
      data-testid="steps-container"
      className={cn('relative mx-3 mt-5', className)}
    >
      {/* Header pill, straddling the top border of the frame. */}
      <div className="absolute -top-4 left-1/2 z-20 -translate-x-1/2">
        <span className="bg-cta text-on-dark rounded-full px-6 py-1 text-sm font-bold whitespace-nowrap shadow-sm">
          {title}
        </span>
      </div>

      {/* Frosted frame body. */}
      <div className="bg-steps-container relative overflow-hidden rounded-card border-[3px] border-white/60 px-3 pt-7 pb-4">
        {/* Serpentine map path: absolute BACKGROUND layer, behind the cards.
            Themed via currentColor (inherits --theme-accent from the screen).
            Stretched (preserveAspectRatio=none) to fill the card stack so each
            of the 4 serpentine lanes sits under its card and the connector
            arcs peek out on alternating sides. */}
        <AllPieces
          aria-hidden="true"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 z-0 h-full w-full"
        />

        {/* Step cards, overlapping the path in front. */}
        <ol className="relative z-10 flex flex-col gap-3">{children}</ol>
      </div>
    </div>
  )
}
