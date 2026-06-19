import { useState } from 'react'
import { BobiLevelTheme1 } from './screens/BobiLevelTheme1/BobiLevelTheme1'
import { MoonFestival } from './screens/MoonFestival/MoonFestival'
import { Section3 } from './screens/Section3/Section3'
import { Section6 } from './screens/Section6/Section6'
import { Section7 } from './screens/Section7/Section7'
import { THEMES } from './lib/themes'
import { cn } from './lib/cn'

/**
 * App shell with top-level navigation between the replicated sections:
 * 波币大闯关 (section 2), 中秋大转盘 (section 5) and 点击领取 (section 3). The
 * per-theme switcher swaps each screen's variant scene; section 3 ships 8 themes,
 * the others 6, so the switcher's theme list is chosen per page.
 */
const PAGES = [
  { id: 'bobi', label: '波币大闯关' },
  { id: 'moon', label: '中秋大转盘' },
  { id: 'section3', label: '点击领取' },
  { id: 'section6', label: '升级模式' },
  { id: 'section7', label: '领取彩金' },
] as const

// Section 3's 8 distinct palettes (accent swatch only drives the switcher dot;
// each theme swaps its whole scene). Themes 6–8 share the violet accent but are
// genuinely different frames in the export.
const SECTION3_THEMES = [
  { id: 'theme1', label: 'Theme 1', accent: '#81ccd1' },
  { id: 'theme2', label: 'Theme 2', accent: '#62b4ff' },
  { id: 'theme3', label: 'Theme 3', accent: '#985de9' },
  { id: 'theme4', label: 'Theme 4', accent: '#fc8aa3' },
  { id: 'theme5', label: 'Theme 5', accent: '#807aff' },
  { id: 'theme6', label: 'Theme 6', accent: '#9a41fe' },
  { id: 'theme7', label: 'Theme 7', accent: '#9a41fe' },
  { id: 'theme8', label: 'Theme 8', accent: '#9a41fe' },
] as const

export default function App() {
  const [page, setPage] = useState<(typeof PAGES)[number]['id']>('bobi')
  const [themeId, setThemeId] = useState(THEMES[0].id)
  const themeList = page === 'section3' ? SECTION3_THEMES : THEMES
  // Clamp the active theme to one the current page actually has.
  const activeTheme = themeList.some((t) => t.id === themeId) ? themeId : themeList[0].id

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
          {themeList.map((t) => {
            const selected = t.id === activeTheme
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

      {page === 'bobi' && (
        <BobiLevelTheme1 themeId={activeTheme} className="mx-auto mt-4 w-[390px] shadow-xl" />
      )}
      {page === 'moon' && (
        <MoonFestival themeId={activeTheme} className="mx-auto mt-4 w-[390px] shadow-xl" />
      )}
      {page === 'section3' && (
        <Section3 themeId={activeTheme} className="mx-auto mt-4 w-[390px] shadow-xl" />
      )}
      {page === 'section6' && (
        <Section6 themeId={activeTheme} className="mx-auto mt-4 w-[390px] shadow-xl" />
      )}
      {page === 'section7' && (
        <Section7 themeId={activeTheme} className="mx-auto mt-4 w-[390px] shadow-xl" />
      )}
    </div>
  )
}
