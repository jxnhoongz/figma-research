import { cn } from '../../lib/cn'
import { StatusIcon, type Status } from '../StatusIcon/StatusIcon'
import { Button } from '../Button/Button'
import { STEP_CARD } from '../svg'

export interface StepStat {
  label: string
  value: string
  unit?: string
}

export type StepSide = 'left' | 'right'

export interface StepCardProps {
  status: Status
  title: string
  requirement: string
  /** Short status label shown on the reward wedge (e.g. 已领取 / 当前关卡). */
  statusText: string
  /** Reward amount, e.g. 彩金 8元. */
  amount: string
  /** Which side the map-path pointer tab juts toward. Default `left`. */
  side?: StepSide
  /** Highlighted current step — renders the orange "current" chrome. */
  active?: boolean
  /** Surfaces an enabled claim CTA. */
  claimable?: boolean
  /** Already-claimed step — claim control shown disabled as 已领取. */
  claimed?: boolean
  /** Progress stats shown only on the active card (Figma 第三关). */
  stats?: StepStat[]
  onClaim?: () => void
  className?: string
}

/** Maps the screen Status to the Component 38 chrome key. */
const CHROME_KEY: Record<Status, keyof typeof STEP_CARD> = {
  done: 'passed',
  active: 'current',
  locked: 'locked',
  fail: 'locked', // fail reuses the grey locked card body
}

/**
 * Mirrors Figma `Component 38` (id 1:5062), the repeated STEP CARD, rendered
 * with the REAL section2 SVG chrome. The SVG provides the card background
 * (rounded body, map-path pointer tab, right reward wedge); content (status
 * icon, title/requirement, reward text, claim control) is overlaid on top.
 *
 * The `passed` chrome carries the themeable accent slot (`currentColor`), so a
 * parent setting `color: var(--theme-accent)` recolors the frosted body per
 * theme. `current` is the semantic orange active card; `locked`/`fail` are grey.
 */
export function StepCard({
  status,
  title,
  requirement,
  statusText,
  amount,
  side = 'left',
  active = false,
  claimable = false,
  claimed = false,
  stats,
  onClaim,
  className,
}: StepCardProps) {
  const variant = active ? 'active' : 'default'
  const Chrome = STEP_CARD[CHROME_KEY[status]][side]
  // Every Component 38 variant has a WHITE inner panel for the main content;
  // only the right reward wedge is colored (orange on current, accent elsewhere).
  // So title/requirement/stats always sit on white — dark text for frosted
  // cards, orange-accent text for the active card.
  const activeText = status === 'active'

  return (
    <article
      data-testid="step-card"
      data-variant={variant}
      data-side={side}
      className={cn('relative w-full', className)}
      style={{ aspectRatio: '245 / 60' }}
    >
      {/* Real Component 38 chrome as the absolute background. */}
      <Chrome
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        aria-hidden="true"
      />

      {/* Content overlay. The right ~36% is the reward wedge per the SVG. */}
      <div className="absolute inset-0 flex items-center pr-[34%] pl-2">
        <StatusIcon
          status={status}
          className="relative z-10 -ml-1 h-[88%] w-auto shrink-0"
        />

        <div className="flex min-w-0 flex-1 flex-col justify-center pl-1">
          <span
            className={cn(
              'truncate text-[13px] leading-tight font-bold',
              activeText ? 'text-active-amount' : 'text-step-text',
            )}
          >
            {title}
          </span>

          {active && stats?.length ? (
            <dl className="mt-0.5 flex flex-col gap-y-0">
              {stats.map((s) => (
                <div key={s.label} className="flex items-baseline gap-1">
                  <dt className="text-step-muted text-[9px]">{s.label}</dt>
                  <dd className="text-active-amount text-[11px] font-bold">
                    {s.value}
                    {s.unit ? (
                      <span className="ml-0.5 text-[9px] font-bold">
                        {s.unit}
                      </span>
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <span className="text-step-muted truncate text-[10px] leading-tight">
              {requirement}
            </span>
          )}
        </div>
      </div>

      {/* Reward wedge content: status text + amount, pinned over the SVG wedge. */}
      <div className="absolute inset-y-0 right-0 flex w-[34%] flex-col items-center justify-center gap-0.5 px-1 text-center">
        <span className="text-on-dark text-[10px] leading-tight font-semibold drop-shadow-sm">
          {statusText}
        </span>
        <span className="text-on-dark text-[13px] leading-tight font-bold drop-shadow-sm">
          {amount}
        </span>
        {claimable ? (
          <Button
            size="md"
            className="mt-0.5 h-4 rounded-full px-1.5 text-[9px] leading-none"
            onClick={onClaim}
          >
            可领取
          </Button>
        ) : claimed ? (
          // statusText already shows 已领取 above; keep a real (sr-only) disabled
          // control so the claimed state is programmatically exposed.
          <Button
            size="md"
            variant="secondary"
            disabled
            className="sr-only"
          >
            已领取
          </Button>
        ) : null}
      </div>
    </article>
  )
}
