import { cn } from '../../lib/cn'
import { StatusIcon, type Status } from '../StatusIcon/StatusIcon'
import { Button } from '../Button/Button'

export interface StepStat {
  label: string
  value: string
  unit?: string
}

export interface StepCardProps {
  status: Status
  title: string
  requirement: string
  /** Short status label shown on the reward pill (e.g. 已领取 / 当前关卡). */
  statusText: string
  /** Reward amount, e.g. 彩金 8元. */
  amount: string
  /** Highlighted current step — renders the orange gradient treatment. */
  active?: boolean
  /** Surfaces an enabled claim CTA. */
  claimable?: boolean
  /** Already-claimed step — claim control is shown disabled as 已领取. */
  claimed?: boolean
  /** Progress stats shown only on the active card (Figma 第三关). */
  stats?: StepStat[]
  onClaim?: () => void
  className?: string
}

/**
 * Mirrors Figma `Component 38` (id 1:5062), the repeated STEP CARD.
 *
 * Default state: a frosted-white glass card (`.bg-step-card`, white 70% stroke,
 * radius 10px) holding the status icon, the level title + requirement, a reward
 * pill (status text + 彩金 amount) and a claim control.
 *
 * Active state (`active`): orange gradient card (`.border-active-grad`) with a
 * rainbow border, optional充值 progress stats, and a prominent claim CTA — the
 * visually dominant block in the reference.
 */
export function StepCard({
  status,
  title,
  requirement,
  statusText,
  amount,
  active = false,
  claimable = false,
  claimed = false,
  stats,
  onClaim,
  className,
}: StepCardProps) {
  const variant = active ? 'active' : 'default'

  return (
    <article
      data-testid="step-card"
      data-variant={variant}
      className={cn(
        'flex items-center gap-3 rounded-[10px] p-3',
        active
          ? 'border-active-grad shadow-[0_4px_12px_rgba(251,105,36,0.35)]'
          : 'bg-step-card border border-white/70',
        className,
      )}
    >
      <StatusIcon status={status} className="shrink-0" />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span
          className={cn(
            'text-sm font-bold',
            active ? 'text-on-dark' : 'text-step-text',
          )}
        >
          {title}
        </span>
        <span
          className={cn(
            'text-xs',
            active ? 'text-on-dark/90' : 'text-step-muted',
          )}
        >
          {requirement}
        </span>

        {active && stats?.length ? (
          <dl className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
            {stats.map((s) => (
              <div key={s.label} className="flex items-baseline gap-1">
                <dt className="text-active-muted text-[10px]">{s.label}</dt>
                <dd className="text-active-amount text-sm font-bold">
                  {s.value}
                  {s.unit ? (
                    <span className="ml-0.5 text-[10px] font-bold">
                      {s.unit}
                    </span>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>

      {/* Reward block: a green frosted mini-card (label + 彩金 amount) on the
          default state; on the active card it sits flush on the orange surface. */}
      <div
        className={cn(
          'flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-[10px] px-3 py-1.5 text-center',
          active ? 'bg-white/15' : 'bg-card-grad',
        )}
      >
        <span
          className={cn(
            'text-[11px] font-semibold',
            active ? 'text-on-dark' : 'text-text-brown',
          )}
        >
          {statusText}
        </span>
        <span
          className={cn(
            'text-sm font-bold',
            active ? 'text-on-dark' : 'text-text-amount',
          )}
        >
          {amount}
        </span>
      </div>

      {claimable ? (
        <Button
          size="md"
          className="h-8 shrink-0 px-3 text-xs"
          onClick={onClaim}
        >
          可领取
        </Button>
      ) : (
        <Button
          size="md"
          variant="secondary"
          disabled
          className="h-8 shrink-0 px-3 text-xs"
        >
          {claimed ? '已领取' : '待闯关'}
        </Button>
      )}
    </article>
  )
}
