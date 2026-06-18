// The 6 themes for 波币大闯关. Each theme recolors the single accent slot that
// the kit SVGs expose as `currentColor` (originally `#9A41FE`), plus the screen
// background. Semantic colors (locked grey, current gold, CTA orange) never
// change per theme — they live inside the SVGs untouched.
//
// `accent` drives `--theme-accent` (the SVG `currentColor`) and `bg` drives
// `--theme-bg` (the screen background). For theme1 the values match the
// existing `--color-screen` token in index.css.

// Real per-theme banner artwork (390×240 @3x), one PNG per theme. Swapped by the
// active theme so the banner changes on theme switch (previously a single shared
// banner stayed put — that was the bug).
import banner1 from '../assets/section2/banner/theme1.png'
import banner2 from '../assets/section2/banner/theme2.png'
import banner3 from '../assets/section2/banner/theme3.png'
import banner4 from '../assets/section2/banner/theme4.png'
import banner5 from '../assets/section2/banner/theme5.png'
import banner6 from '../assets/section2/banner/theme6.png'

export interface Theme {
  id: string
  label: string
  /** Recolors the SVG accent slot (was #9A41FE) + serves as the screen bg. */
  accent: string
  /** Screen background. Same as accent per the brief (screen bg = theme accent). */
  bg: string
  /** Per-theme banner image src (the real section2 banner for this theme). */
  banner: string
}

export const THEMES: Theme[] = [
  { id: 'theme1', label: 'Theme 1', accent: '#81ccd1', bg: '#81ccd1', banner: banner1 },
  { id: 'theme2', label: 'Theme 2', accent: '#62b4ff', bg: '#62b4ff', banner: banner2 },
  { id: 'theme3', label: 'Theme 3', accent: '#985de9', bg: '#985de9', banner: banner3 },
  { id: 'theme4', label: 'Theme 4', accent: '#fc8aa3', bg: '#fc8aa3', banner: banner4 },
  { id: 'theme5', label: 'Theme 5', accent: '#807aff', bg: '#807aff', banner: banner5 },
  { id: 'theme6', label: 'Theme 6', accent: '#9a41fe', bg: '#9a41fe', banner: banner6 },
]

export const DEFAULT_THEME = THEMES[0]

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? DEFAULT_THEME
}

/** CSS custom properties a theme contributes to a wrapper element. */
export function themeVars(theme: Theme): Record<string, string> {
  return {
    '--theme-accent': theme.accent,
    '--theme-bg': theme.bg,
  }
}
