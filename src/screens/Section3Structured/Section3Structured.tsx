import { useState } from 'react'
import { rewards, type RewardItem } from './generated/rewards'
import { RewardGrid } from './generated/RewardGrid'

// Bundle the generated card images (chrome + baked); resolve filename → URL.
const urls = import.meta.glob('./generated/img/*', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>
const byName: Record<string, string> = {}
for (const [p, u] of Object.entries(urls)) byName[p.split('/').pop()!] = u
const assetUrl = (f: string) => byName[f]

/**
 * Demo: the SAME data renders two ways — left = baked v1 images (frozen), right =
 * the generated <RewardGrid> (text overlaid on text-less chrome). The live
 * control edits a field and the generated grid updates; the baked side doesn't.
 */
export function Section3Structured({ className }: { className?: string }) {
  const [items, setItems] = useState<RewardItem[]>(rewards)
  const [sel, setSel] = useState(0)
  const fieldKeys = Object.keys(rewards[0].fields)
  const [field, setField] = useState(fieldKeys[0])

  const setVal = (value: string) =>
    setItems((prev) => prev.map((it, i) => (i === sel ? { ...it, fields: { ...it.fields, [field]: value } } : it)))

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2 p-3 text-sm">
        <span className="font-semibold">Live edit:</span>
        <select
          data-testid="edit-card"
          value={sel}
          onChange={(e) => setSel(Number(e.target.value))}
          className="rounded border px-2 py-1"
        >
          {items.map((it, i) => (
            <option key={it.id} value={i}>
              card {i + 1}
            </option>
          ))}
        </select>
        <select
          data-testid="edit-field"
          value={field}
          onChange={(e) => setField(e.target.value)}
          className="rounded border px-2 py-1"
        >
          {fieldKeys.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <input
          data-testid="edit-input"
          value={items[sel].fields[field] ?? ''}
          onChange={(e) => setVal(e.target.value)}
          className="rounded border px-2 py-1"
        />
      </div>

      <div className="flex gap-6 p-3">
        <section>
          <h3 className="mb-2 text-xs font-semibold text-neutral-500">Baked (v1) — frozen pixels</h3>
          <div data-testid="baked-grid" className="flex flex-wrap gap-2" style={{ width: 360 }}>
            {items.map((r) =>
              r.bakedImage ? <img key={r.id} src={assetUrl(r.bakedImage)} alt="" /> : null,
            )}
          </div>
        </section>
        <section>
          <h3 className="mb-2 text-xs font-semibold text-neutral-500">Generated — editable data</h3>
          <div data-testid="generated-grid">
            <RewardGrid items={items} assetUrl={assetUrl} />
          </div>
        </section>
      </div>
    </div>
  )
}
