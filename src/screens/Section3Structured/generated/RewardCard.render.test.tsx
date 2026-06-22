import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RewardCard } from './RewardCard'
import { rewards } from './rewards'

const fieldsOf = (i: number) => rewards[i].fields

// SLOTS for screen 1:33188 are two leaf flex rows (top-level groups):
//   "group"  = amount row (x:0, y:69) → amount + currency
//   "group2" = label row  (x:0, y:94) → text3 (投注) + requirement
// A slotOverride nudges a slot from its natural position: top-level group rows
// shift their absolute left/top; flex-child text slots shift via relative offset.

describe('generated RewardCard', () => {
  it('renders a long amount in a flex row without a fixed-width overflow', () => {
    render(<RewardCard chrome="" fields={{ ...fieldsOf(0), amount: '8888' }} />)
    const el = screen.getByText('8888')
    // group child spans render in a flex container (auto width), not a fixed PositionedText box
    expect(el.tagName.toLowerCase()).toBe('span')
    expect((el.parentElement as HTMLElement).style.display).toBe('flex')
  })

  it('applies a slotOverride to shift a top-level group row (absolute)', () => {
    const { container } = render(
      <RewardCard chrome="" fields={fieldsOf(0)} slotOverrides={{ group: { x: 10 } }} />,
    )
    const group = container.querySelector('div[style*="position: absolute"][style*="flex"]') as HTMLElement
    // base group x is 0 (from extract) + override 10 = 10
    expect(group.style.left).toBe('10px')
  })

  it('applies a slotOverride to nudge a flex-child text slot (relative)', () => {
    render(<RewardCard chrome="" fields={fieldsOf(0)} slotOverrides={{ amount: { x: 5, y: 2 } }} />)
    const el = screen.getByText('28') as HTMLElement // card 0 amount
    expect(el.style.position).toBe('relative')
    expect(el.style.left).toBe('5px')
    expect(el.style.top).toBe('2px')
  })
})
