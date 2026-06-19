import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from './App'
import { THEMES, getTheme } from './lib/themes'

describe('App theme switcher', () => {
  it('renders a button for each of the 6 themes', () => {
    render(<App />)
    THEMES.forEach((t) => {
      expect(screen.getByTestId(`theme-btn-${t.id}`)).toBeInTheDocument()
    })
  })

  it('defaults to theme1 and sets its accent var on the screen', () => {
    render(<App />)
    const screenEl = screen.getByTestId('bobi-screen')
    expect(screenEl).toHaveAttribute('data-theme', 'theme1')
    expect(screenEl.style.getPropertyValue('--theme-accent')).toBe(
      getTheme('theme1').accent,
    )
  })

  it('selecting theme3 recolors the screen accent + bg vars', () => {
    render(<App />)
    fireEvent.click(screen.getByTestId('theme-btn-theme3'))

    const screenEl = screen.getByTestId('bobi-screen')
    const theme3 = getTheme('theme3')
    expect(screenEl).toHaveAttribute('data-theme', 'theme3')
    expect(screenEl.style.getPropertyValue('--theme-accent')).toBe(theme3.accent)
    expect(screenEl.style.getPropertyValue('--theme-bg')).toBe(theme3.bg)
  })

  it('marks the selected theme button via aria-pressed', () => {
    render(<App />)
    fireEvent.click(screen.getByTestId('theme-btn-theme5'))
    expect(screen.getByTestId('theme-btn-theme5')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByTestId('theme-btn-theme1')).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('drives the bottom 活动详情 section off the theme accent so it recolors', () => {
    render(<App />)
    // The section must use the DIRECT accent utility (resolved at point-of-use)
    // rather than `bg-screen` (an @theme token that froze the accent at :root
    // and stayed teal on theme switch).
    const section = screen.getByTestId('info-section')
    expect(section).toHaveClass('bg-theme-accent')
    expect(section.className).not.toContain('bg-screen')
  })

  it('marks 昨日闯关 (left) as the active tab, 今日闯关 inactive', () => {
    render(<App />)
    expect(screen.getByRole('tab', { name: '昨日闯关' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: '今日闯关' })).toHaveAttribute(
      'aria-selected',
      'false',
    )
  })

  it('renders 闯关排列 + 活动详情 with the IDENTICAL header structure', () => {
    render(<App />)
    const headers = screen.getAllByTestId('section-header')
    const titled = headers.filter((h) =>
      ['闯关排列', '活动详情'].some((t) => h.textContent?.includes(t)),
    )
    expect(titled.length).toBe(2)
    const norm = (el: HTMLElement) =>
      el.innerHTML.replace('闯关排列', 'TITLE').replace('活动详情', 'TITLE')
    expect(norm(titled[0])).toBe(norm(titled[1]))
  })

  it('swaps the banner image when the theme changes', () => {
    render(<App />)
    const bannerImg = screen.getByRole('img', { name: '波币大闯关' })
    const theme1Src = bannerImg.getAttribute('src')
    expect(theme1Src).toBe(getTheme('theme1').banner)

    fireEvent.click(screen.getByTestId('theme-btn-theme3'))
    const after = screen.getByRole('img', { name: '波币大闯关' })
    expect(after.getAttribute('src')).toBe(getTheme('theme3').banner)
    expect(after.getAttribute('src')).not.toBe(theme1Src)
  })
})
