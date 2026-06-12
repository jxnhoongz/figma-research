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
})
