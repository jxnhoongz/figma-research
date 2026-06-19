import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ClaimButton } from './ClaimButton'

describe('ClaimButton', () => {
  it('exposes the claim copy as its accessible name', () => {
    render(<ClaimButton label="可领取" amount="3888" currency="元" />)
    expect(
      screen.getByRole('button', { name: '可领取 3888元' }),
    ).toBeInTheDocument()
  })

  it('renders the real exported claim asset as an img (not a CSS button)', () => {
    const { container } = render(
      <ClaimButton label="可领取" amount="3888" currency="元" />,
    )
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    // The baked SVG (claim-content.svg = the real Claim_Content_1-1188 export).
    expect(img?.getAttribute('src')).toMatch(/claim-content\.svg/)
    // The art is decorative; the accessible name lives on the button itself.
    expect(img).toHaveAttribute('aria-hidden', 'true')
    expect(
      screen.getByRole('button', { name: '可领取 3888元' }),
    ).toBeInTheDocument()
  })

  it('fires onClick when pressed', () => {
    const onClick = vi.fn()
    render(<ClaimButton label="可领取" amount="3888" onClick={onClick} />)
    fireEvent.click(screen.getByTestId('claim-button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not fire onClick when disabled', () => {
    const onClick = vi.fn()
    render(
      <ClaimButton label="可领取" amount="3888" disabled onClick={onClick} />,
    )
    fireEvent.click(screen.getByTestId('claim-button'))
    expect(onClick).not.toHaveBeenCalled()
  })
})
