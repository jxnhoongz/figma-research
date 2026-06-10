import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TabSwitch } from './TabSwitch'

const tabs = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
]

describe('TabSwitch', () => {
  it('renders all tabs inside a tablist', () => {
    render(<TabSwitch tabs={tabs} active="daily" onChange={() => {}} />)
    expect(screen.getByRole('tablist')).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(2)
    expect(screen.getByRole('tab', { name: 'Daily' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Weekly' })).toBeInTheDocument()
  })

  it('marks active vs inactive via data-variant and aria-selected', () => {
    render(<TabSwitch tabs={tabs} active="weekly" onChange={() => {}} />)
    const active = screen.getByRole('tab', { name: 'Weekly' })
    const inactive = screen.getByRole('tab', { name: 'Daily' })
    expect(active).toHaveAttribute('data-variant', 'active')
    expect(active).toHaveAttribute('aria-selected', 'true')
    expect(inactive).toHaveAttribute('data-variant', 'inactive')
    expect(inactive).toHaveAttribute('aria-selected', 'false')
  })

  it('fires onChange with the tab id when clicked', () => {
    const onChange = vi.fn()
    render(<TabSwitch tabs={tabs} active="daily" onChange={onChange} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Weekly' }))
    expect(onChange).toHaveBeenCalledWith('weekly')
  })
})
