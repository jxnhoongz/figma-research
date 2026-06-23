import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProgressCard, type ProgressData } from './ProgressCard'

const mockData: ProgressData = {
  currentBet: '266',
  currentBetLabel: '当前有效投注',
  nextTierGap: '734',
  nextTierLabel: '距离下一档 5元 还差',
  target: '1000',
  targetLabel: '目标',
  progressRatio: 0.266,
  claimAmount: '5',
}

describe('ProgressCard', () => {
  it('renders all stat labels and values', () => {
    render(<ProgressCard data={mockData} />)
    expect(screen.getByText('当前有效投注')).toBeInTheDocument()
    expect(screen.getByText('¥266')).toBeInTheDocument()
    expect(screen.getByText('距离下一档 5元 还差')).toBeInTheDocument()
    expect(screen.getByText('¥734')).toBeInTheDocument()
    expect(screen.getByText('目标')).toBeInTheDocument()
    expect(screen.getByText('¥1000')).toBeInTheDocument()
  })

  it('defaults to data-variant="unclaimed"', () => {
    render(<ProgressCard data={mockData} />)
    expect(screen.getByTestId('progress-card')).toHaveAttribute('data-variant', 'unclaimed')
  })

  it('claimed prop sets data-variant="claimed"', () => {
    render(<ProgressCard data={mockData} claimed />)
    expect(screen.getByTestId('progress-card')).toHaveAttribute('data-variant', 'claimed')
  })

  it('shows claim amount in button when unclaimed', () => {
    render(<ProgressCard data={mockData} />)
    expect(screen.getByTestId('claim-btn')).toHaveTextContent('立即领取 ¥5')
  })

  it('shows 已领取 in button when claimed', () => {
    render(<ProgressCard data={mockData} claimed />)
    expect(screen.getByTestId('claim-btn')).toHaveTextContent('已领取')
  })

  it('calls onClaim when button is clicked', () => {
    const onClaim = vi.fn()
    render(<ProgressCard data={mockData} onClaim={onClaim} />)
    fireEvent.click(screen.getByTestId('claim-btn'))
    expect(onClaim).toHaveBeenCalledOnce()
  })

  it('button is disabled when claimed', () => {
    render(<ProgressCard data={mockData} claimed />)
    expect(screen.getByTestId('claim-btn')).toBeDisabled()
  })

  it('renders progress bar with correct width', () => {
    render(<ProgressCard data={mockData} />)
    const bar = screen.getByTestId('progress-bar')
    expect(bar).toHaveStyle({ width: '26.6%' })
  })
})
