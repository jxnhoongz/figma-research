import { useState } from 'react'
import { BobiLevelTheme1 } from './screens/BobiLevelTheme1/BobiLevelTheme1'
import { MoonFestival } from './screens/MoonFestival/MoonFestival'
import { THEMES } from './lib/themes'
import { cn } from './lib/cn'

/**
 * App shell with top-level navigation between the two replicated sections:
 * 波币大闯关 (section 2) and 中秋大转盘 (section 5). The per-theme switcher only
 * applies to the bobi screen, whose kit SVGs recolor via `--theme-accent`.
 */
const PAGES = [
  { id: 'bobi', label: '波币大闯关' },
  { id: 'moon', label: '中秋大转盘' },
] as const

export default function App() {
  const [page, setPage] = useState<(typeof PAGES)[number]['id']>('bobi')
  const [themeId, setThemeId] = useState(THEMES[0].id)

  return (
    <div className="min-h-screen bg-neutral-100 pb-8">
      {/* Top-level page tabs. */}
      <div
        data-testid="page-nav"
        className="sticky top-0 z-50 flex justify-center gap-2 bg-white/95 p-3 backdrop-blur"
      >
        {PAGES.map((p) => {
          const selected = p.id === page
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              data-testid={`page-tab-${p.id}`}
              aria-selected={selected}
              onClick={() => setPage(p.id)}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm font-semibold transition',
                selected
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-300 bg-white text-neutral-700',
              )}
            >
              {p.label}
            </button>
          )
        })}
      </div>

      {/* Theme switcher — both sections have the same 6 themes (bobi recolors
          its kit SVGs via --theme-accent; moon festival swaps its variant scene). */}
      {
        <div
          data-testid="theme-switcher"
          className="flex flex-wrap justify-center gap-2 bg-white/70 px-3 pb-3 backdrop-blur"
        >
          {THEMES.map((t) => {
            const selected = t.id === themeId
            return (
              <button
                key={t.id}
                type="button"
                data-testid={`theme-btn-${t.id}`}
                aria-pressed={selected}
                onClick={() => setThemeId(t.id)}
                className={cn(
                  'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                  selected
                    ? 'border-neutral-800 bg-neutral-900 text-white'
                    : 'border-neutral-300 bg-white text-neutral-700',
                )}
              >
                <span
                  aria-hidden="true"
                  className="size-3 rounded-full border border-black/10"
                  style={{ backgroundColor: t.accent }}
                />
                {t.label}
              </button>
            )
          })}
        </div>
      }

      {page === 'bobi' ? (
        <BobiLevelTheme1 themeId={themeId} className="mx-auto mt-4 w-[390px] shadow-xl" />
      ) : (
        <MoonFestival themeId={themeId} className="mx-auto mt-4 w-[390px] shadow-xl" />
      )}
    </div>
  )
}
