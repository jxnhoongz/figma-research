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
 * Mirrors Figma "Step Block" (306×60) from the screen structure JSON. Exact
 * measured nesting (no guessed widths):
 *
 *   Step Block 306×60  HORIZONTAL gap 10  counter CENTER
 *    ├ Status Icon 51×51                 ← ALWAYS left, fixed-width sibling
 *    └ Step Block Content 245×60         ← the Component 38 SVG (245×60 viewBox)
 *        ├ Step Card Background 234×60    ← SVG chrome, absolute BEHIND
 *        └ Step Info 234×55  pad T6/B6/L12, primary-align MAX (push to ends)
 *            ├ Step Info Content 128×39   ← title + requirement / stats
 *            └ Step Card 84×43            ← reward wedge: statusText + amount
 *
 * The status icon is a real 51px sibling of the card — NOT overlaid inside it —
 * which is what un-cramps the layout. The icon ALTERNATES sides per `side` (the
 * serpentine zigzag from the structure JSON): left-icon on odd blocks, right-icon
 * on even blocks, matching the road. The card's INTERNAL order (info left, reward
 * wedge right) stays fixed; only the icon swaps sides, and the card's pointer tab
 * (Polygon 2, baked into the SVG variant) follows `side`.
 *
 * The `passed` chrome carries the themeable accent slot (`currentColor`), so a
 * parent setting `color: var(--theme-accent)` recolors the frosted body. The
 * `current` chrome is the semantic orange active card; `locked`/`fail` are grey.
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
  // The card body is white in every variant; only the right reward wedge is
  // colored. Active step uses orange-accent text, frosted steps use dark text.
  const activeText = status === 'active'

  return (
    // Step Block: 306 wide = icon 51 + gap 10 + content 245. Fixed px so the
    // 362→346→322→306→245 chain holds and cards never cramp.
    <article
      data-testid="step-card"
      data-variant={variant}
      data-side={side}
      className={cn(
        'flex w-[306px] items-center gap-2.5',
        // Serpentine zigzag: even (right) blocks put the icon on the RIGHT.
        side === 'right' && 'flex-row-reverse',
        className,
      )}
    >
      {/* Status Icon 51×51 — always left, fixed-width sibling. */}
      <StatusIcon
        status={status}
        className="h-[51px] w-[51px] shrink-0"
      />

      {/* Step Block Content 245×60 — the Component 38 SVG with the Step Info
          overlaid. The SVG provides the card body + right reward wedge. */}
      <div className="relative h-[60px] w-[245px] shrink-0">
        <Chrome
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
          aria-hidden="true"
        />

        {/* Step Info 234×55: pad T6/B6/L12, primary-align MAX so the info
            content sits left and the reward wedge sits right. */}
        <div className="absolute inset-y-0 right-0 left-3 flex items-center justify-between gap-2.5 py-1.5">
          {/* Step Info Content 128×39: title + requirement (or active stats). */}
          <div className="flex min-w-0 flex-col justify-center">
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

          {/* Step Card 84×43: reward wedge — statusText + amount, pad L18/R18. */}
          <div className="flex w-[84px] shrink-0 flex-col items-center justify-center gap-0.5 px-2 text-center">
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
              // statusText already shows 已领取 above; keep a real (sr-only)
              // disabled control so the claimed state is exposed to a11y/tests.
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
        </div>
      </div>
    </article>
  )
}
