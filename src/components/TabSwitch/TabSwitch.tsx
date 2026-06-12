import type { ComponentType, SVGProps } from 'react'
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
  /**
   * Optional real tab-switch SVG art keyed by the active tab id. When provided,
   * the matching SVG paints the pill (with its baked-in active highlight + text)
   * and the buttons sit transparently on top for interaction + a11y.
   */
  artByActive?: Record<string, ComponentType<SVGProps<SVGSVGElement>>>
}

const tab = cva(
  'relative z-10 flex-1 h-9 px-4 text-sm font-semibold rounded-tab transition-colors',
  {
    variants: {
      variant: {
        active: 'text-on-dark',
        inactive: 'text-on-dark/70',
      },
      art: {
        // When real SVG art is shown, hide the CSS label text (baked into art).
        true: 'text-transparent',
        false: '',
      },
    },
    compoundVariants: [
      { art: false, variant: 'active', class: 'bg-tab-active' },
    ],
    defaultVariants: { art: false },
  },
)

export function TabSwitch({
  tabs,
  active,
  onChange,
  className,
  artByActive,
}: TabSwitchProps) {
  const Art = artByActive?.[active]

  return (
    <div role="tablist" className={cn('relative flex gap-1 p-1', className)}>
      {Art ? (
        <Art
          aria-hidden="true"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
      ) : null}
      {tabs.map((t) => {
        const variant = t.id === active ? 'active' : 'inactive'
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={variant === 'active'}
            data-variant={variant}
            className={tab({ variant, art: Boolean(Art) })}
            onClick={() => onChange(t.id)}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
