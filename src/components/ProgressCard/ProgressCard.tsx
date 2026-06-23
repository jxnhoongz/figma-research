import { cn } from '../../lib/cn'

export interface ProgressData {
  currentBet: string
  currentBetLabel: string
  nextTierGap: string
  nextTierLabel: string
  target: string
  targetLabel: string
  progressRatio: number // 0–1
  claimAmount: string
}

export interface ProgressCardProps {
  data: ProgressData
  onClaim?: () => void
  claimed?: boolean
  className?: string
}

/**
 * Progress card for Section 3 "点击领取". Shows three stat columns (current bet,
 * gap to next tier, target), a progress bar, and a claim button.
 */
export function ProgressCard({ data, onClaim, claimed = false, className }: ProgressCardProps) {
  return (
    <div
      data-testid="progress-card"
      data-variant={claimed ? 'claimed' : 'unclaimed'}
      className={cn(
        'relative rounded-[20px] bg-white px-5 py-4 shadow-sm',
        className,
      )}
    >
      {/* Three stat columns */}
      <div className="flex justify-between text-center">
        <div>
          <div className="text-table-text text-[10px]">{data.currentBetLabel}</div>
          <div className="text-text-brown font-bold text-base">¥{data.currentBet}</div>
        </div>
        <div>
          <div className="text-table-text text-[10px]">{data.nextTierLabel}</div>
          <div className="text-text-brown font-bold text-base">¥{data.nextTierGap}</div>
        </div>
        <div>
          <div className="text-table-text text-[10px]">{data.targetLabel}</div>
          <div className="text-text-brown font-bold text-base">¥{data.target}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-2 rounded-full bg-neutral-200 overflow-hidden">
        <div
          data-testid="progress-bar"
          className="h-full rounded-full bg-cta transition-all"
          style={{ width: `${Math.min(1, data.progressRatio) * 100}%` }}
        />
      </div>

      {/* Claim button */}
      <button
        type="button"
        data-testid="claim-btn"
        onClick={onClaim}
        disabled={claimed}
        className={cn(
          'mt-4 w-full rounded-[18px] bg-cta text-on-dark font-semibold h-11 text-sm',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        )}
      >
        {claimed ? '已领取' : `立即领取 ¥${data.claimAmount}`}
      </button>
    </div>
  )
}
