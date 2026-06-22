import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Section3Structured } from './Section3Structured'
import { rewards } from './generated/rewards'

describe('Section3Structured', () => {
  it('renders the baked grid and the generated grid', () => {
    render(<Section3Structured />)
    // baked grid: one <img> per reward with a baked image
    const baked = document.querySelectorAll('[data-testid="baked-grid"] img')
    expect(baked.length).toBe(rewards.filter((r) => r.bakedImage).length)
    // generated grid present
    expect(screen.getByTestId('generated-grid')).toBeInTheDocument()
  })

  it('live edit updates the generated grid text, not the baked images', () => {
    render(<Section3Structured />)
    const input = screen.getByTestId('edit-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'ZZZ' } })
    // the generated grid now shows the new value somewhere
    expect(screen.getByTestId('generated-grid').textContent).toContain('ZZZ')
  })
})
