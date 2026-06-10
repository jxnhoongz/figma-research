import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Banner } from './Banner'

describe('Banner', () => {
  it('renders an img with the default banner src', () => {
    render(<Banner />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src')
    expect(img.getAttribute('src')).toBeTruthy()
  })

  it('uses title as alt text when provided', () => {
    render(<Banner title="Level rewards" />)
    expect(screen.getByRole('img', { name: 'Level rewards' })).toBeInTheDocument()
  })

  it('falls back to "banner" alt when no title', () => {
    render(<Banner />)
    expect(screen.getByRole('img', { name: 'banner' })).toBeInTheDocument()
  })

  it('renders a custom src when given', () => {
    render(<Banner src="/custom.png" />)
    expect(screen.getByRole('img')).toHaveAttribute('src', '/custom.png')
  })
})
