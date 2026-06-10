import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusIcon } from './StatusIcon'

const statuses = ['locked', 'active', 'done', 'fail'] as const

describe('StatusIcon', () => {
  it.each(statuses)('sets data-variant=%s and a src on the img', (status) => {
    render(<StatusIcon status={status} />)
    const img = screen.getByRole('img', { name: `step ${status}` })
    expect(img).toHaveAttribute('data-variant', status)
    expect(img).toHaveAttribute('src')
    expect(img.getAttribute('src')).toBeTruthy()
  })
})
