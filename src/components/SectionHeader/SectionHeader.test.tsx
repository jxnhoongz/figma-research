import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SectionHeader } from './SectionHeader'

describe('SectionHeader', () => {
  it('renders the title text', () => {
    render(<SectionHeader title="闯关排列" />)
    expect(screen.getByText('闯关排列')).toBeInTheDocument()
  })

  it('renders the real star + underline decoration assets (two aria-hidden imgs)', () => {
    const { container } = render(<SectionHeader title="活动详情" />)
    const decos = container.querySelectorAll('img[aria-hidden="true"]')
    expect(decos.length).toBe(2)
  })

  it('renders the title at the 22px display face with #222222 text', () => {
    render(<SectionHeader title="活动详情" />)
    const h = screen.getByText('活动详情')
    expect(h.className).toContain('font-display')
    expect(h.className).toContain('text-[22px]')
    expect(h.className).toContain('text-[#222222]')
  })

  it('paints the white OUTSIDE stroke on the title (paint-order: stroke)', () => {
    render(<SectionHeader title="活动详情" />)
    const h = screen.getByText('活动详情')
    // Structure JSON: TEXT node has #222222 fill + 1px OUTSIDE #ffffff stroke.
    // text-stroke is centred so 2px yields ~1px showing outside the dark fill.
    expect(h.style.paintOrder).toBe('stroke')
    expect(h.style.webkitTextStroke).toContain('#ffffff')
  })

  it('renders IDENTICAL structure for both 闯关排列 and 活动详情', () => {
    const a = render(<SectionHeader title="闯关排列" />)
    const aHtml = a.container.innerHTML.replace('闯关排列', 'TITLE')
    a.unmount()
    const b = render(<SectionHeader title="活动详情" />)
    const bHtml = b.container.innerHTML.replace('活动详情', 'TITLE')
    expect(aHtml).toBe(bHtml)
  })
})
