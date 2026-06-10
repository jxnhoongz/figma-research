import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renders children as an accessible button', () => {
    render(<Button>Claim</Button>)
    expect(screen.getByRole('button', { name: 'Claim' })).toBeInTheDocument()
  })

  it('defaults to data-variant="primary"', () => {
    render(<Button>Go</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'primary')
  })

  it('renders secondary variant when requested', () => {
    render(<Button variant="secondary">Go</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'secondary')
  })

  it('disabled resolves to disabled variant and is disabled', () => {
    render(<Button disabled>Go</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('data-variant', 'disabled')
  })

  it('fires onClick when enabled', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Go</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
