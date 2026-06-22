import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Section3Structured } from './Section3Structured'

describe('Section3Structured (full screen + inspector)', () => {
  it('renders the baked screen scene and the editable grid overlay', () => {
    render(<Section3Structured />)
    expect(screen.getByTestId('scene')).toBeInTheDocument()
    expect(screen.getByTestId('generated-grid')).toBeInTheDocument()
  })

  it('live text edit updates the overlaid grid', () => {
    render(<Section3Structured />)
    const input = screen.getByTestId('edit-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'ZZ9' } })
    expect(screen.getByTestId('generated-grid').textContent).toContain('ZZ9')
  })

  it('a position control writes a slot override', () => {
    render(<Section3Structured />)
    const xInput = screen.getAllByTestId('pos-x')[0] as HTMLInputElement
    fireEvent.change(xInput, { target: { value: '7' } })
    expect(xInput.value).toBe('7')
  })
})
