import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RewardCard } from './RewardCard'

describe('RewardCard', () => {
  it('renders label and amount', () => {
    render(<RewardCard label="Level 3" amount="+120" />)
    expect(screen.getByText('Level 3')).toBeInTheDocument()
    expect(screen.getByText('+120')).toBeInTheDocument()
  })

  it('defaults to data-variant="unclaimed"', () => {
    render(<RewardCard label="Level 3" amount="+120" />)
    expect(screen.getByTestId('reward-card')).toHaveAttribute('data-variant', 'unclaimed')
  })

  it('claimed sets data-variant="claimed"', () => {
    render(<RewardCard label="Level 3" amount="+120" claimed />)
    expect(screen.getByTestId('reward-card')).toHaveAttribute('data-variant', 'claimed')
  })
})
