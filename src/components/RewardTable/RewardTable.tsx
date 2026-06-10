import { cn } from '../../lib/cn'

/** A column definition. `align` controls cell text alignment (default center). */
export interface RewardColumn {
  id: string
  label: string
  align?: 'left' | 'center'
}

/**
 * A single body row. `cells` is positional and MUST match `columns` length.
 * `highlight` surfaces the row's values in the brand-highlight color (the
 * Figma 第一关 tier renders its 彩金 in blue).
 */
export interface RewardRow {
  id: string
  cells: string[]
  highlight?: boolean
}

interface RewardTableProps {
  columns: RewardColumn[]
  rows: RewardRow[]
  className?: string
}

/**
 * Generic data-driven rewards grid for the 活动详情 section
 * (Figma Frame 1410107570 / node 1:1197+). Renders a teal header row and
 * alternately-striped body rows with #CACACA cell dividers. Purely
 * presentational: pass `columns` + positional `rows`.
 */
export function RewardTable({ columns, rows, className }: RewardTableProps) {
  // Validate at the boundary: positional cells must line up with columns.
  rows.forEach((row) => {
    if (row.cells.length !== columns.length) {
      throw new Error(
        `RewardTable: row "${row.id}" has ${row.cells.length} cells but ` +
          `${columns.length} columns are defined.`,
      )
    }
  })

  return (
    <table
      data-testid="reward-table"
      className={cn(
        'border-table-border w-full table-fixed border-collapse overflow-hidden rounded-table border text-xs',
        className,
      )}
    >
      <thead>
        <tr className="bg-table-header">
          {columns.map((col) => (
            <th
              key={col.id}
              scope="col"
              className={cn(
                'text-table-header-text border-table-border h-10 border px-1 font-medium',
                col.align === 'left' ? 'text-left' : 'text-center',
              )}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => {
          const stripe = rowIndex % 2 === 0 ? 'odd' : 'even'
          return (
            <tr
              key={row.id}
              data-testid={`reward-row-${row.id}`}
              data-stripe={stripe}
              data-highlight={row.highlight ? 'true' : 'false'}
              className={stripe === 'even' ? 'bg-table-stripe' : 'bg-table-cell'}
            >
              {row.cells.map((value, cellIndex) => {
                const col = columns[cellIndex]
                return (
                  <td
                    key={col.id}
                    className={cn(
                      'border-table-border h-10 border px-1 font-medium',
                      col.align === 'left' ? 'text-left' : 'text-center',
                      row.highlight
                        ? 'text-table-highlight'
                        : 'text-table-text',
                    )}
                  >
                    {value}
                  </td>
                )
              })}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
