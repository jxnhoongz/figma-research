import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { RewardTable, type RewardColumn, type RewardRow } from './RewardTable'

const columns: RewardColumn[] = [
  { id: 'tier', label: '日累计充值', align: 'left' },
  { id: 'level', label: '关卡' },
  { id: 'm2', label: '2倍' },
  { id: 'm5', label: '5倍' },
]

const rows: RewardRow[] = [
  { id: 'r1', cells: ['1000元+', '第一关', '8元', '18元'], highlight: true },
  { id: 'r2', cells: ['5000元+', '第二关', '18元', '28元'] },
]

describe('RewardTable', () => {
  it('renders every column header', () => {
    render(<RewardTable columns={columns} rows={rows} />)
    expect(screen.getByText('日累计充值')).toBeInTheDocument()
    expect(screen.getByText('关卡')).toBeInTheDocument()
    expect(screen.getByText('2倍')).toBeInTheDocument()
    expect(screen.getByText('5倍')).toBeInTheDocument()
  })

  it('renders every row cell value', () => {
    render(<RewardTable columns={columns} rows={rows} />)
    expect(screen.getByText('1000元+')).toBeInTheDocument()
    expect(screen.getByText('第一关')).toBeInTheDocument()
    expect(screen.getByText('5000元+')).toBeInTheDocument()
    expect(screen.getByText('第二关')).toBeInTheDocument()
  })

  it('exposes a table role with the right column/row counts', () => {
    render(<RewardTable columns={columns} rows={rows} />)
    const table = screen.getByRole('table')
    expect(table).toBeInTheDocument()
    // header row + 2 body rows
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    expect(within(table).getAllByRole('columnheader')).toHaveLength(4)
  })

  it('flags striped rows by parity via data-stripe', () => {
    render(<RewardTable columns={columns} rows={rows} />)
    expect(screen.getByTestId('reward-row-r1')).toHaveAttribute(
      'data-stripe',
      'odd',
    )
    expect(screen.getByTestId('reward-row-r2')).toHaveAttribute(
      'data-stripe',
      'even',
    )
  })

  it('marks highlighted rows via data-highlight', () => {
    render(<RewardTable columns={columns} rows={rows} />)
    expect(screen.getByTestId('reward-row-r1')).toHaveAttribute(
      'data-highlight',
      'true',
    )
    expect(screen.getByTestId('reward-row-r2')).toHaveAttribute(
      'data-highlight',
      'false',
    )
  })

  it('highlights ONLY the specified cell (not the whole row)', () => {
    // Figma highlights a single cell (第一关 / 2倍 = 8元) in blue, not the row.
    const single: RewardRow[] = [
      { id: 'h', cells: ['1000元+', '第一关', '8元', '18元'], highlightCells: [2] },
    ]
    render(<RewardTable columns={columns} rows={single} />)
    const blue = screen.getByText('8元')
    expect(blue).toHaveAttribute('data-highlight', 'true')
    expect(blue).toHaveClass('text-table-highlight')
    // Sibling value in the same row is NOT highlighted.
    const plain = screen.getByText('18元')
    expect(plain).not.toHaveAttribute('data-highlight')
    expect(plain).toHaveClass('text-table-text')
    // The row still reports data-highlight=true (it contains a highlighted cell).
    expect(screen.getByTestId('reward-row-h')).toHaveAttribute(
      'data-highlight',
      'true',
    )
  })

  it('drives the header off the theme accent (bg-theme-accent → --theme-accent)', () => {
    render(<RewardTable columns={columns} rows={rows} />)
    // The header row uses the DIRECT accent utility (bg-theme-accent →
    // var(--theme-accent)), resolved at point-of-use so it recolors on theme
    // switch. (The old `bg-table-header` token captured the var at :root and
    // stayed a frozen teal — that was the bug.)
    const headerRow = screen.getByText('日累计充值').closest('tr')
    expect(headerRow).toHaveClass('bg-theme-accent')
    // Cell dividers + striped rows also follow the accent directly, so the
    // WHOLE table recolors cohesively, not just the header.
    const header = screen.getByText('日累计充值')
    expect(header).toHaveClass('border-theme-tint')
    const stripeRow = screen.getByTestId('reward-row-r2')
    expect(stripeRow).toHaveClass('bg-theme-tint')
  })

  it('throws when a row has the wrong number of cells', () => {
    const bad: RewardRow[] = [{ id: 'x', cells: ['only-one'] }]
    expect(() => render(<RewardTable columns={columns} rows={bad} />)).toThrow()
  })
})
