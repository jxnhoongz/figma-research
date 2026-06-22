import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PositionedText } from './PositionedText'

const base = {
  x: 10, y: 20, w: 40, h: 16, fontFamily: 'PingFang SC', fontSize: 14,
  fontWeight: 700, color: '#222', align: 'center', lineHeight: 16, letterSpacing: 0,
}

describe('PositionedText', () => {
  it('renders the text absolutely positioned with the colour', () => {
    render(<PositionedText {...base} text="28¥" />)
    const el = screen.getByText('28¥')
    expect(el).toHaveStyle({ position: 'absolute', top: '20px', color: '#222' })
  })

  it('renders per-character runs as coloured spans', () => {
    render(<PositionedText {...base} text="AB" runs={[{ text: 'A', color: '#f00' }, { text: 'B', color: '#00f' }]} />)
    expect(screen.getByText('A')).toHaveStyle({ color: '#f00' })
    expect(screen.getByText('B')).toHaveStyle({ color: '#00f' })
  })

  it('applies a text stroke when provided', () => {
    render(<PositionedText {...base} text="X" stroke={{ color: '#fff', width: 1 }} />)
    const el = screen.getByText('X')
    expect(el).toHaveStyle({ WebkitTextStrokeColor: '#fff' })
  })
})
