import { cn } from '../../lib/cn'
import claimArt from '../../assets/section2/decor/claim-content.svg'

interface ClaimButtonProps {
  /** Leading label, e.g. 可领取. */
  label: string
  /** Numeric amount, e.g. 3888. */
  amount: string
  /** Currency suffix, e.g. 元. */
  currency?: string
  disabled?: boolean
  onClick?: () => void
  className?: string
}

/**
 * Mirrors Figma "Claim Button Container" (node 1:1186): the orange 可领取 3888元
 * CTA below the last step. The exported pill art (`claim-content.svg`, node
 * 1:1188) is the WHOLE button — the layered orange gradient pill AND the
 * "可领取 3888元" label, baked in as vector outlines (label = YouSheBiaoTiHei 16,
 * amount = DIN Alternate 700/24, all white, per the structure JSON nodes
 * 1:1193/1:1195/1:1196). So the art is the visual; the `label`/`amount`/`currency`
 * props drive only the accessible name (and are validated against the baked copy
 * by the test), never a second visible text layer.
 */
export function ClaimButton({
  label,
  amount,
  currency = '元',
  disabled = false,
  onClick,
  className,
}: ClaimButtonProps) {
  const accessibleName = `${label} ${amount}${currency}`
  return (
    <button
      type="button"
      data-testid="claim-button"
      aria-label={accessibleName}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'relative inline-flex h-[63px] w-[190px] items-center justify-center',
        'disabled:cursor-not-allowed',
        className,
      )}
    >
      <img
        src={claimArt}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
    </button>
  )
}
