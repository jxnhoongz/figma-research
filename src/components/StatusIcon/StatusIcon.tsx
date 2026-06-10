import { cn } from '../../lib/cn'
import done from '../../assets/bobi-theme1/status-done.svg'
import active from '../../assets/bobi-theme1/status-active.svg'
import locked from '../../assets/bobi-theme1/status-locked.svg'
import fail from '../../assets/bobi-theme1/status-fail.svg'

export type Status = 'locked' | 'active' | 'done' | 'fail'

const SRC: Record<Status, string> = { locked, active, done, fail }

export interface StatusIconProps {
  status: Status
  className?: string
}

export function StatusIcon({ status, className }: StatusIconProps) {
  return (
    <img
      role="img"
      aria-label={`step ${status}`}
      data-variant={status}
      src={SRC[status]}
      className={cn('size-[51px]', className)}
    />
  )
}
