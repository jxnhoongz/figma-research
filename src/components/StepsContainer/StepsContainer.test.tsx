import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StepsContainer } from './StepsContainer'

describe('StepsContainer', () => {
  it('renders the 闯关排列 title pill as the frame header', () => {
    render(
      <StepsContainer title="闯关排列">
        <li>card</li>
      </StepsContainer>,
    )
    expect(screen.getByText('闯关排列')).toBeInTheDocument()
  })

  it('wraps all step cards inside a single container frame', () => {
    render(
      <StepsContainer title="闯关排列">
        <li data-testid="c1">one</li>
        <li data-testid="c2">two</li>
      </StepsContainer>,
    )
    const container = screen.getByTestId('steps-container')
    expect(container).toContainElement(screen.getByTestId('c1'))
    expect(container).toContainElement(screen.getByTestId('c2'))
  })

  it('renders the claim footer below the step list when provided', () => {
    render(
      <StepsContainer
        title="闯关排列"
        footer={<button data-testid="claim">claim</button>}
      >
        <li>card</li>
      </StepsContainer>,
    )
    expect(screen.getByTestId('claim')).toBeInTheDocument()
  })

  it('renders the serpentine map path as an aria-hidden background layer', () => {
    const { container } = render(
      <StepsContainer title="闯关排列">
        <li>card</li>
      </StepsContainer>,
    )
    // The map path svg sits behind the cards (z-0) and is decorative.
    const bg = container.querySelector('svg[aria-hidden="true"].z-0')
    expect(bg).not.toBeNull()
    expect(bg).toHaveClass('z-0')
  })
})
