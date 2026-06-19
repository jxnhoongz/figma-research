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

  it('renders the real exported claim assets (tray + pill) as decorative imgs', () => {
    const { container } = render(
      <ClaimButton label="可领取" amount="3888" currency="元" />,
    )
    // Claim Button Container = Rectangle 346245410 tray + Claim_Content pill,
    // both real exported SVGs (vite may inline them as data URIs in test).
    const imgs = container.querySelectorAll('img')
    expect(imgs.length).toBe(2)
    imgs.forEach((img) => expect(img).toHaveAttribute('aria-hidden', 'true'))
    // The art is decorative; the accessible name lives on the button itself.
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
