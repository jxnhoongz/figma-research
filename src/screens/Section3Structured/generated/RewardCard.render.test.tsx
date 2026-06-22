import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RewardCard } from './RewardCard'
import { rewards } from './rewards'

const fieldsOf = (i: number) => rewards[i].fields

// NOTE: The regenerated SLOTS for screen 1:33188 have a nested group structure:
//   "group" (column, x:0, y:17) → "group2" (row, amount+currency) + "group3" (row, requirement)
// There is no top-level "amountRow" key. "group2" is the amount flex row, "group" is the outer column.

describe('generated RewardCard', () => {
  it('renders a long amount in a flex row without a fixed-width overflow', () => {
    render(<RewardCard chrome="" fields={{ ...fieldsOf(0), amount: '8888' }} />)
    const el = screen.getByText('8888')
    // group child spans render in a flex container (auto width), not a fixed PositionedText box
    expect(el.tagName.toLowerCase()).toBe('span')
    expect((el.parentElement as HTMLElement).style.display).toBe('flex')
  })

  it('applies a slotOverride to shift a slot', () => {
    const { container } = render(
      <RewardCard chrome="" fields={fieldsOf(0)} slotOverrides={{ group: { x: 10 } }} />,
    )
    const group = container.querySelector('div[style*="position: absolute"][style*="flex"]') as HTMLElement
    // base group x is 0 (from extract) + override 10 = 10
    expect(group.style.left).toBe('10px')
  })
})
