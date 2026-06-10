import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepCard } from './StepCard'

const base = {
  status: 'done' as const,
  title: '第一关',
  requirement: '累计充值 1000元+',
  amount: '彩金 8元',
}

describe('StepCard', () => {
  it('renders title, requirement and amount', () => {
    render(<StepCard {...base} statusText="已领取" />)
    expect(screen.getByText('第一关')).toBeInTheDocument()
    expect(screen.getByText('累计充值 1000元+')).toBeInTheDocument()
    expect(screen.getByText('彩金 8元')).toBeInTheDocument()
  })

  it('renders the status icon for the given status', () => {
    render(<StepCard {...base} statusText="已领取" />)
    expect(screen.getByRole('img', { name: 'step done' })).toBeInTheDocument()
  })

  it('uses the default (frosted) variant for non-active steps', () => {
    render(<StepCard {...base} statusText="已领取" />)
    expect(screen.getByTestId('step-card')).toHaveAttribute(
      'data-variant',
      'default',
    )
  })

  it('uses the active variant when active', () => {
    render(
      <StepCard
        {...base}
        status="active"
        statusText="当前关卡"
        active
        claimable
      />,
    )
    expect(screen.getByTestId('step-card')).toHaveAttribute(
      'data-variant',
      'active',
    )
  })

  it('shows a claim button when claimable and fires onClaim', () => {
    const onClaim = vi.fn()
    render(
      <StepCard
        {...base}
        status="active"
        statusText="当前关卡"
        active
        claimable
        onClaim={onClaim}
      />,
    )
    const btn = screen.getByRole('button', { name: '可领取' })
    fireEvent.click(btn)
    expect(onClaim).toHaveBeenCalledTimes(1)
  })

  it('shows a disabled claimed control for done steps', () => {
    render(<StepCard {...base} statusText="已领取" claimed />)
    const btn = screen.getByRole('button', { name: '已领取' })
    expect(btn).toBeDisabled()
  })

  it('renders progress stats on the active card when provided', () => {
    render(
      <StepCard
        {...base}
        status="active"
        statusText="当前关卡"
        active
        claimable
        stats={[
          { label: '日计充值', value: '3,756', unit: '元' },
          { label: '有效投', value: '65,422', unit: '(0倍)' },
        ]}
      />,
    )
    expect(screen.getByText('日计充值')).toBeInTheDocument()
    expect(screen.getByText('3,756')).toBeInTheDocument()
    expect(screen.getByText('有效投')).toBeInTheDocument()
  })
})
