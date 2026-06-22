import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildIR } from './build-ir.mjs'
import { extractComponent, genRewardsTs, genRewardCardTsx, genRewardGridTsx } from './emit-component.mjs'

const fx = (f) => JSON.parse(readFileSync(join('scripts/__fixtures__', f), 'utf8'))
const doc = fx('reward-grid.structure.json').document
const manifest = fx('reward-grid.manifest.json')
const chrome = { '1:5': 'chrome/Card_1-5.png', '1:6': 'chrome/Card_1-6.png', '1:7': 'chrome/Card_1-7.png' }
const ir = buildIR(doc, '1:1', manifest)
const model = extractComponent(ir, chrome, manifest)

describe('extractComponent', () => {
  it('selects the recurring card component (3 instances)', () => {
    expect(model).not.toBeNull()
    expect(model.items).toHaveLength(3)
    expect(model.card).toEqual({ w: 80, h: 100 })
  })

  it('derives one slot keyed by the meaningful layer name, card-relative', () => {
    expect(model.slots).toHaveLength(1)
    const s = model.slots[0]
    expect(s.key).toBe('amount')          // layer "amount" is a valid identifier ≠ its text
    expect(s.x).toBe(20)                   // 40 (content) - 20 (card origin)
    expect(s.style.fontWeight).toBe(700)
  })

  it('extracts per-card data with flattened image filenames + field values', () => {
    expect(model.items.map((i) => i.fields.amount)).toEqual(['28¥', '88¥', '188¥'])
    expect(model.items[0].bakedImage).toBe('png-Card_1-5.png')
    expect(model.items[0].chromeImage).toBe('chrome-Card_1-5.png')
  })
})

describe('codegen', () => {
  it('rewards.ts exports a typed RewardItem array with the data', () => {
    const out = genRewardsTs(model)
    expect(out).toContain('export interface RewardItem')
    expect(out).toContain('export const rewards: RewardItem[]')
    expect(out).toContain('"amount": "28¥"')
    expect(out).toContain('chrome-Card_1-5.png')
  })

  it('RewardCard.tsx imports PositionedText and renders a slot per field', () => {
    const out = genRewardCardTsx(model)
    expect(out).toContain("from '../../../components/PositionedText/PositionedText'")
    expect(out).toContain('const SLOTS')
    expect(out).toContain('<PositionedText')
    expect(out).toContain('SLOTS.map((s) =>')
    expect(out).toContain("text={fields[s.key] ?? ''}")
    expect(out).toContain('"key": "amount"')
  })

  it('RewardGrid.tsx maps items to RewardCard', () => {
    const out = genRewardGridTsx(model)
    expect(out).toContain('items.map')
    expect(out).toContain('<RewardCard')
  })
})
