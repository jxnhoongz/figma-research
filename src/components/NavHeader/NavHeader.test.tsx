import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NavHeader } from './NavHeader'

describe('NavHeader', () => {
  it('renders the title text', () => {
    render(<NavHeader title="波币大闯关" />)
    expect(screen.getByText('波币大闯关')).toBeInTheDocument()
  })

  it('renders a back control with an accessible label', () => {
    render(<NavHeader title="波币大闯关" />)
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })

  it('calls onBack when the back control is activated', () => {
    const onBack = vi.fn()
    render(<NavHeader title="波币大闯关" onBack={onBack} />)
    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('exposes a status-bar region (spacer for the device status bar)', () => {
    render(<NavHeader title="波币大闯关" />)
    expect(screen.getByTestId('nav-header')).toHaveAttribute(
      'data-variant',
      'with-statusbar',
    )
  })
})
