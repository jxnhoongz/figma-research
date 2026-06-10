import { cva } from 'class-variance-authority'
import { cn } from '../../lib/cn'

export interface Tab {
  id: string
  label: string
}

export interface TabSwitchProps {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
  className?: string
}

const tab = cva(
  'flex-1 h-9 px-4 text-sm font-semibold rounded-tab transition-colors',
  {
    variants: {
      variant: {
        active: 'bg-tab-active text-on-dark',
        inactive: 'bg-transparent text-on-dark/70',
      },
    },
  },
)

export function TabSwitch({ tabs, active, onChange, className }: TabSwitchProps) {
  return (
    <div role="tablist" className={cn('flex gap-1 p-1', className)}>
      {tabs.map((t) => {
        const variant = t.id === active ? 'active' : 'inactive'
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={variant === 'active'}
            data-variant={variant}
            className={tab({ variant })}
            onClick={() => onChange(t.id)}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
