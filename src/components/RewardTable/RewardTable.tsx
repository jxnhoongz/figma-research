import { cn } from '../../lib/cn'

/** A column definition. `align` controls cell text alignment (default center). */
export interface RewardColumn {
  id: string
  label: string
  align?: 'left' | 'center'
  /**
   * CSS width for this column (e.g. `'22%'`). Rendered via a `<colgroup>`.
   * In Figma the label column is 80/350 (~23%) and value columns ~13% each;
   * without this every `table-fixed` column would be equal and the label +
   * header text wrap. Omit to fall back to equal distribution.
   */
  width?: string
}

/**
 * A single body row. `cells` is positional and MUST match `columns` length.
 *
 * `highlightCells` lists the column indices whose value should render in the
 * brand-highlight color (blue). In Figma ONLY the 第一关 row's 2倍 reward
 * (`8元`) is blue — a single cell, NOT the whole row — so this is positional
 * and granular rather than a row-wide flag. `highlight` is kept as a derived
 * convenience that highlights the FIRST value cell (index after the label/level
 * columns) and also surfaces a row-level `data-highlight` marker.
 */
export interface RewardRow {
  id: string
  cells: string[]
  /** Column indices (0-based, into `cells`) to render in the highlight blue. */
  highlightCells?: number[]
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
        'border-table-border w-full table-fixed border-collapse overflow-hidden rounded-table border text-[11px]',
        className,
      )}
    >
      {columns.some((c) => c.width) ? (
        <colgroup>
          {columns.map((col) => (
            <col key={col.id} style={col.width ? { width: col.width } : undefined} />
          ))}
        </colgroup>
      ) : null}
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
          // Resolve the set of highlighted cell indices. Explicit
          // `highlightCells` wins; otherwise `highlight` is a convenience that
          // lights up the first VALUE cell (skipping the label + 关卡 columns).
          const highlighted = new Set(
            row.highlightCells ?? (row.highlight ? [2] : []),
          )
          const rowHighlighted = highlighted.size > 0
          return (
            <tr
              key={row.id}
              data-testid={`reward-row-${row.id}`}
              data-stripe={stripe}
              data-highlight={rowHighlighted ? 'true' : 'false'}
              className={stripe === 'even' ? 'bg-table-stripe' : 'bg-table-cell'}
            >
              {row.cells.map((value, cellIndex) => {
                const col = columns[cellIndex]
                const isHi = highlighted.has(cellIndex)
                return (
                  <td
                    key={col.id}
                    data-highlight={isHi ? 'true' : undefined}
                    className={cn(
                      'border-table-border h-10 border px-0.5 whitespace-nowrap',
                      col.align === 'left' ? 'text-left' : 'text-center',
                      // The blue highlight cell is fw-400 (PingFang HK in Figma);
                      // every other cell is fw-500.
                      isHi
                        ? 'text-table-highlight font-normal'
                        : 'text-table-text font-medium',
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
