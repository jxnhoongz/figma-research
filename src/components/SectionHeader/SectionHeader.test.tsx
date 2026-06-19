import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SectionHeader } from './SectionHeader'

describe('SectionHeader', () => {
  it('renders the title text', () => {
    render(<SectionHeader title="闯关排列" />)
    expect(screen.getByText('闯关排列')).toBeInTheDocument()
  })

  it('renders a star + underline decoration (two aria-hidden svgs)', () => {
    const { container } = render(<SectionHeader title="活动详情" />)
    const decos = container.querySelectorAll('svg[aria-hidden="true"]')
    expect(decos.length).toBe(2)
  })

  it('renders the title at the 22px display face with #222222 text', () => {
    render(<SectionHeader title="活动详情" />)
    const h = screen.getByText('活动详情')
    expect(h.className).toContain('font-display')
    expect(h.className).toContain('text-[22px]')
    expect(h.className).toContain('text-[#222222]')
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
