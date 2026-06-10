import { cva } from 'class-variance-authority'
import { cn } from '../../lib/cn'

export interface RewardCardProps {
  label: string
  amount: string
  claimed?: boolean
  className?: string
}

const card = cva(
  'flex flex-col items-center gap-1 p-4 rounded-card bg-card-grad transition-opacity',
  {
    variants: {
      variant: {
        unclaimed: 'opacity-100',
        claimed: 'opacity-50',
      },
    },
  },
)

export function RewardCard({ label, amount, claimed = false, className }: RewardCardProps) {
  const variant = claimed ? 'claimed' : 'unclaimed'

  return (
    <div data-testid="reward-card" data-variant={variant} className={cn(card({ variant }), className)}>
      <span className="text-text-brown text-sm font-medium">{label}</span>
      <span className="text-text-amount text-lg font-bold">{amount}</span>
    </div>
  )
}
