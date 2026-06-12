import { useState } from 'react'
import { BobiLevelTheme1 } from './screens/BobiLevelTheme1/BobiLevelTheme1'
import { THEMES } from './lib/themes'
import { cn } from './lib/cn'

/**
 * App shell with the 6-theme switcher. Selecting a theme passes its id to the
 * screen, which sets `--theme-accent` / `--theme-bg` — the kit SVGs follow the
 * accent through `currentColor`, so the chrome recolors live.
 */
export default function App() {
  const [themeId, setThemeId] = useState(THEMES[0].id)

  return (
    <div className="min-h-screen bg-neutral-100 pb-8">
      {/* Theme switcher. */}
      <div
        data-testid="theme-switcher"
        className="sticky top-0 z-50 flex flex-wrap justify-center gap-2 bg-white/90 p-3 backdrop-blur"
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

      <BobiLevelTheme1 themeId={themeId} className="mx-auto mt-4 w-[390px] shadow-xl" />
    </div>
  )
}
