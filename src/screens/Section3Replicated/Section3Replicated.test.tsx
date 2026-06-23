import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Section3Replicated } from './Section3Replicated'

describe('Section3Replicated', () => {
  it('renders the scene-root wrapper', () => {
    render(<Section3Replicated />)
    expect(screen.getByTestId('scene-root')).toBeInTheDocument()
  })

  it('renders the baked SceneRenderer (scene testid)', () => {
    render(<Section3Replicated />)
    expect(screen.getByTestId('scene')).toBeInTheDocument()
  })

  it('claim button is present and initially unclaimed', () => {
    render(<Section3Replicated />)
    const btn = screen.getByTestId('claim-btn')
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveAttribute('data-variant', 'unclaimed')
    expect(btn).not.toBeDisabled()
  })

  it('clicking the claim button transitions to claimed state', () => {
    render(<Section3Replicated />)
    const btn = screen.getByTestId('claim-btn')
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('data-variant', 'claimed')
    expect(btn).toBeDisabled()
  })

  it('shows 已领取 badge after claim', () => {
    render(<Section3Replicated />)
    expect(screen.queryByTestId('claimed-badge')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('claim-btn'))
    expect(screen.getByTestId('claimed-badge')).toHaveTextContent('已领取')
  })

  it('scene-root is sized to the scene dimensions (390px wide)', () => {
    render(<Section3Replicated />)
    const root = screen.getByTestId('scene-root')
    expect(root).toHaveStyle({ width: '390px' })
  })
})
