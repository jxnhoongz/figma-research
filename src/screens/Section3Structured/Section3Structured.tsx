import { useState } from 'react'
import { SceneRenderer, type Scene } from '../../components/SceneRenderer/SceneRenderer'
import sceneData from '../Section3/scenes/theme1.json'
import { rewards, gridBox, slotKeys, type RewardItem } from './generated/rewards'
import { RewardGrid } from './generated/RewardGrid'

// Baked Section 3 screen assets.
const sceneUrls = import.meta.glob('../../assets/section3/img/*', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const sceneByName: Record<string, string> = {}
for (const [p, u] of Object.entries(sceneUrls)) sceneByName[p.split('/').pop()!] = u

// Generated card (chrome) images.
const cardUrls = import.meta.glob('./generated/img/*', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const cardByName: Record<string, string> = {}
for (const [p, u] of Object.entries(cardUrls)) cardByName[p.split('/').pop()!] = u

const scene = sceneData as Scene
type Overrides = Record<string, { x?: number; y?: number }>

/**
 * The full 点击领取 screen (baked via SceneRenderer) with the reward grid
 * overlaid as a live, editable component at its real position, plus an inspector
 * to edit each card's text and nudge slot positions (component-level).
 */
export function Section3Structured({ className }: { className?: string }) {
  const [items, setItems] = useState<RewardItem[]>(rewards)
  const [overrides, setOverrides] = useState<Overrides>({})
  const [sel, setSel] = useState(0)
  const fieldKeys = Object.keys(rewards[0].fields)
  const [field, setField] = useState(fieldKeys[0])

  const setText = (value: string) =>
    setItems((prev) => prev.map((it, i) => (i === sel ? { ...it, fields: { ...it.fields, [field]: value } } : it)))
  const setPos = (key: string, axis: 'x' | 'y', value: string) =>
    setOverrides((prev) => ({ ...prev, [key]: { ...prev[key], [axis]: value === '' ? undefined : Number(value) } }))

  return (
    <div className={className}>
      <div className="flex gap-4">
        {/* Inspector */}
        <aside className="w-64 shrink-0 space-y-4 p-3 text-sm">
          <div>
            <div className="mb-1 font-semibold">Text</div>
            <div className="flex flex-wrap items-center gap-2">
              <select data-testid="edit-card" value={sel} onChange={(e) => setSel(Number(e.target.value))} className="rounded border px-2 py-1">
                {items.map((it, i) => (<option key={it.id} value={i}>card {i + 1}</option>))}
              </select>
              <select data-testid="edit-field" value={field} onChange={(e) => setField(e.target.value)} className="rounded border px-2 py-1">
                {fieldKeys.map((k) => (<option key={k} value={k}>{k}</option>))}
              </select>
              <input data-testid="edit-input" value={items[sel].fields[field] ?? ''} onChange={(e) => setText(e.target.value)} className="w-full rounded border px-2 py-1" />
            </div>
          </div>
          <div>
            <div className="mb-1 font-semibold">Positions (all cards)</div>
            <div className="space-y-1">
              {slotKeys.map((k) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="w-24 truncate text-xs text-neutral-500">{k}</span>
                  <input data-testid="pos-x" type="number" placeholder="x" value={overrides[k]?.x ?? ''} onChange={(e) => setPos(k, 'x', e.target.value)} className="w-14 rounded border px-1 py-0.5" />
                  <input data-testid="pos-y" type="number" placeholder="y" value={overrides[k]?.y ?? ''} onChange={(e) => setPos(k, 'y', e.target.value)} className="w-14 rounded border px-1 py-0.5" />
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Full screen with editable grid overlay */}
        <div className="max-h-[760px] overflow-auto rounded-xl border bg-neutral-50 p-2">
          <div style={{ position: 'relative', width: scene.width, height: scene.height }}>
            <SceneRenderer scene={scene} assetUrl={(f) => sceneByName[f]} />
            <div data-testid="generated-grid" style={{ position: 'absolute', left: gridBox.x, top: gridBox.y }}>
              <RewardGrid items={items} assetUrl={(f) => cardByName[f]} slotOverrides={overrides} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
