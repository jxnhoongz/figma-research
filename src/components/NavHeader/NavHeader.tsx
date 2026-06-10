import { cn } from '../../lib/cn'

export interface NavHeaderProps {
  /** Centered page title (Figma: 波币大闯关, navy #110940). */
  title: string
  /** Invoked when the back chevron is pressed. */
  onBack?: () => void
  className?: string
}

/**
 * Mirrors Figma `Frame 1410102067`: a white nav bar that occupies the 84px
 * zone above the banner. Includes a device status-bar spacer, a left back
 * chevron, and a centered title. Status-bar contents (time/signal) are baked
 * into the reference screenshot; here we reserve the vertical space so the
 * layout density matches.
 */
export function NavHeader({ title, onBack, className }: NavHeaderProps) {
  return (
    <header
      data-testid="nav-header"
      data-variant="with-statusbar"
      className={cn('bg-nav w-full', className)}
    >
      {/* Status-bar spacer (device clock/battery live here on real hardware). */}
      <div aria-hidden="true" className="h-11" />

      <div className="relative flex h-11 items-center px-4">
        <button
          type="button"
          aria-label="back"
          onClick={onBack}
          className="text-nav-title absolute left-3 flex size-8 items-center justify-center"
        >
          <svg
            width="11"
            height="18"
            viewBox="0 0 11 18"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M9.5 1.5 2 9l7.5 7.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <h1 className="text-nav-title flex-1 text-center text-[15px] font-medium">
          {title}
        </h1>
      </div>
    </header>
  )
}
