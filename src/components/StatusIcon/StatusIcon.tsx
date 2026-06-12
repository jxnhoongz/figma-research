import { cn } from '../../lib/cn'
import { STATUS_ICON } from '../svg'

export type Status = 'locked' | 'active' | 'done' | 'fail'

export interface StatusIconProps {
  status: Status
  className?: string
}

/**
 * Renders the real section2 status-icon SVG (id set 1:5015) for the given
 * status. The `done` (passed) glyph carries the themeable accent slot
 * (`currentColor`); `locked`/`fail` are semantic grey and `active` is the
 * semantic gold star — none of those follow the theme.
 *
 * Exposes `role="img"` + `aria-label="step <status>"` + `data-variant` so the
 * surrounding kit and tests can identify the state.
 */
export function StatusIcon({ status, className }: StatusIconProps) {
  const Glyph = STATUS_ICON[status]
  return (
    <Glyph
      role="img"
      aria-label={`step ${status}`}
      data-variant={status}
      className={cn('h-[52px] w-[57px]', className)}
    />
  )
}
