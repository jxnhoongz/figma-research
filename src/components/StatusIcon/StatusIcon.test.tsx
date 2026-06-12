import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusIcon } from './StatusIcon'

const statuses = ['locked', 'active', 'done', 'fail'] as const

describe('StatusIcon', () => {
  it.each(statuses)('renders an inline svg glyph with data-variant=%s', (status) => {
    render(<StatusIcon status={status} />)
    const img = screen.getByRole('img', { name: `step ${status}` })
    expect(img).toHaveAttribute('data-variant', status)
    // Real assets are now inline <svg> components (themeable), not <img src>.
    expect(img.tagName.toLowerCase()).toBe('svg')
  })
})
