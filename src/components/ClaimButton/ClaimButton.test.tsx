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
