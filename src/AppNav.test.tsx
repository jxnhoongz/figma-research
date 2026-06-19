import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from './App'

describe('App page navigation', () => {
  it('defaults to the 波币大闯关 page (bobi screen + theme switcher visible)', () => {
    render(<App />)
    expect(screen.getByTestId('page-tab-bobi')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('bobi-screen')).toBeInTheDocument()
    expect(screen.getByTestId('theme-switcher')).toBeInTheDocument()
  })

  it('switches to 中秋大转盘 and shows the scene; theme switcher stays (6 variants)', () => {
    render(<App />)
    fireEvent.click(screen.getByTestId('page-tab-moon'))
    expect(screen.getByTestId('page-tab-moon')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('scene')).toBeInTheDocument()
    expect(screen.queryByTestId('bobi-screen')).toBeNull()
    expect(screen.getByTestId('theme-switcher')).toBeInTheDocument()
  })

  it('swaps the moon-festival scene when the theme changes', () => {
    render(<App />)
    fireEvent.click(screen.getByTestId('page-tab-moon'))
    const before = screen.getByTestId('scene').querySelectorAll('img').length
    fireEvent.click(screen.getByTestId('theme-btn-theme2'))
    // theme1 (variant 17, active state) has more placements than theme2 — the
    // scene actually changed, not just recolored.
    const after = screen.getByTestId('scene').querySelectorAll('img').length
    expect(after).not.toBe(before)
  })
})
