import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Section3Replicated } from './Section3Replicated'

describe('Section3Replicated', () => {
  it('renders the scene root', () => {
    render(<Section3Replicated />)
    expect(screen.getByTestId('scene-root')).toBeInTheDocument()
  })

  it('renders the nav header with correct title', () => {
    render(<Section3Replicated />)
    expect(screen.getByTestId('nav-header')).toBeInTheDocument()
    expect(screen.getByText('逢6必发')).toBeInTheDocument()
  })

  it('renders the progress card in unclaimed state', () => {
    render(<Section3Replicated />)
    const card = screen.getByTestId('progress-card')
    expect(card).toBeInTheDocument()
    expect(card).toHaveAttribute('data-variant', 'unclaimed')
  })

  it('clicking claim button transitions progress card to claimed', () => {
    render(<Section3Replicated />)
    const btn = screen.getByTestId('claim-btn')
    expect(btn).toHaveTextContent('立即领取 ¥5')
    fireEvent.click(btn)
    expect(screen.getByTestId('progress-card')).toHaveAttribute('data-variant', 'claimed')
    expect(btn).toHaveTextContent('已领取')
    expect(btn).toBeDisabled()
  })

  it('renders the reward grid', () => {
    render(<Section3Replicated />)
    expect(screen.getByTestId('reward-grid')).toBeInTheDocument()
  })

  it('renders 12 reward card images', () => {
    render(<Section3Replicated />)
    // Banner + table + 12 reward cards = 14 images total
    const grid = screen.getByTestId('reward-grid')
    const cardImgs = grid.querySelectorAll('img')
    expect(cardImgs).toHaveLength(12)
  })

  it('first reward card has a 当前 badge', () => {
    render(<Section3Replicated />)
    expect(screen.getByTestId('current-badge')).toHaveTextContent('当前')
  })

  it('renders activity sections', () => {
    render(<Section3Replicated />)
    // SectionHeader renders section-header testids
    const headers = screen.getAllByTestId('section-header')
    // Three headers: 奖励预览, 活动详情, 活动细则
    expect(headers.length).toBeGreaterThanOrEqual(3)
  })
})
