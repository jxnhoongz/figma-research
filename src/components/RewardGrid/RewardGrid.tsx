import { cn } from '../../lib/cn'

export interface RewardGridItem {
  id: string
  src: string
  alt: string
  current?: boolean
}

export interface RewardGridProps {
  items: RewardGridItem[]
  className?: string
}

/**
 * Renders reward card images in a 4×3 grid. Each item is a baked PNG with a
 * coin icon and amount (genuine art). The `current` flag overlays a 当前 badge.
 */
export function RewardGrid({ items, className }: RewardGridProps) {
  return (
    <div
      data-testid="reward-grid"
      data-variant="grid"
      className={cn('grid grid-cols-4 gap-2 p-2', className)}
    >
      {items.map((item) => (
        <div key={item.id} className="relative">
          <img
            src={item.src}
            alt={item.alt}
            className="w-full"
          />
          {item.current && (
            <span
              data-testid="current-badge"
              className="absolute top-0 left-0 rounded-tl-[20px] rounded-br-[20px] bg-cta text-on-dark text-[9px] px-1 py-px font-semibold"
            >
              当前
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
