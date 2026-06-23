import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RewardGrid, type RewardGridItem } from './RewardGrid'

const makeItems = (count: number): RewardGridItem[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `card-${i}`,
    src: `/card-${i}.png`,
    alt: `¥${(i + 1) * 5}`,
  }))

describe('RewardGrid', () => {
  it('renders with data-variant="grid"', () => {
    render(<RewardGrid items={makeItems(4)} />)
    expect(screen.getByTestId('reward-grid')).toHaveAttribute('data-variant', 'grid')
  })

  it('renders all items as images', () => {
    render(<RewardGrid items={makeItems(12)} />)
    expect(screen.getAllByRole('img')).toHaveLength(12)
  })

  it('shows current badge only on items with current=true', () => {
    const items: RewardGridItem[] = [
      { id: '1', src: '/a.png', alt: '¥5', current: true },
      { id: '2', src: '/b.png', alt: '¥8' },
      { id: '3', src: '/c.png', alt: '¥18', current: false },
    ]
    render(<RewardGrid items={items} />)
    const badges = screen.queryAllByTestId('current-badge')
    expect(badges).toHaveLength(1)
    expect(badges[0]).toHaveTextContent('当前')
  })

  it('renders correct alt text for each image', () => {
    const items: RewardGridItem[] = [
      { id: '1', src: '/a.png', alt: '¥5 reward' },
      { id: '2', src: '/b.png', alt: '¥8 reward' },
    ]
    render(<RewardGrid items={items} />)
    expect(screen.getByAltText('¥5 reward')).toBeInTheDocument()
    expect(screen.getByAltText('¥8 reward')).toBeInTheDocument()
  })
})
