// The 6 themes for 波币大闯关. Each theme recolors the single accent slot that
// the kit SVGs expose as `currentColor` (originally `#9A41FE`), plus the screen
// background. Semantic colors (locked grey, current gold, CTA orange) never
// change per theme — they live inside the SVGs untouched.
//
// `accent` drives `--theme-accent` (the SVG `currentColor`) and `bg` drives
// `--theme-bg` (the screen background). For theme1 the values match the
// existing `--color-screen` token in index.css.

export interface Theme {
  id: string
  label: string
  /** Recolors the SVG accent slot (was #9A41FE) + serves as the screen bg. */
  accent: string
  /** Screen background. Same as accent per the brief (screen bg = theme accent). */
  bg: string
}

export const THEMES: Theme[] = [
  { id: 'theme1', label: 'Theme 1', accent: '#81ccd1', bg: '#81ccd1' },
  { id: 'theme2', label: 'Theme 2', accent: '#62b4ff', bg: '#62b4ff' },
  { id: 'theme3', label: 'Theme 3', accent: '#985de9', bg: '#985de9' },
  { id: 'theme4', label: 'Theme 4', accent: '#fc8aa3', bg: '#fc8aa3' },
  { id: 'theme5', label: 'Theme 5', accent: '#807aff', bg: '#807aff' },
  { id: 'theme6', label: 'Theme 6', accent: '#9a41fe', bg: '#9a41fe' },
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
