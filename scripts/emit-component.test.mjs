import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildIR } from './build-ir.mjs'
import { extractComponent, genRewardsTs, genRewardCardTsx, genRewardGridTsx, valueKey, fieldKey } from './emit-component.mjs'

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

describe('field naming', () => {
  it('valueKey classifies common reward values', () => {
    expect(valueKey('28')).toBe('amount')
    expect(valueKey('1,000')).toBe('amount')
    expect(valueKey('¥')).toBe('currency')
    expect(valueKey('5万+')).toBe('requirement')
    expect(valueKey('1000元+')).toBe('requirement')
    expect(valueKey('投注')).toBeNull() // generic label → no value class
  })

  it('fieldKey prefers a valid layer name, falls back to value, then positional, de-duped', () => {
    const used = new Set()
    expect(fieldKey('label', '投注', 0, used)).toBe('label') // valid name ≠ text
    expect(fieldKey('5万+', '5万+', 1, used)).toBe('requirement') // name == text → value
    expect(fieldKey('', '28', 2, used)).toBe('amount')
    expect(fieldKey('', '188', 3, used)).toBe('amount2') // de-dup
    expect(fieldKey('', '投注', 4, used)).toBe('text5') // no class → positional
  })
})

describe('slot style is trimmed to PositionedText props', () => {
  it('drops alignVertical / fontPostScriptName / fontStyle from slots', () => {
    const s = model.slots[0].style
    expect(s).toHaveProperty('fontFamily')
    expect(s).toHaveProperty('color')
    expect(s).not.toHaveProperty('alignVertical')
    expect(s).not.toHaveProperty('fontPostScriptName')
    expect(s).not.toHaveProperty('fontStyle')
  })
})

describe('RewardGrid exports layout constants', () => {
  it('emits GRID_GAP / GRID_PADDING / GRID_WIDTH', () => {
    const out = genRewardGridTsx(model)
    expect(out).toContain('export const GRID_GAP')
    expect(out).toContain('export const GRID_PADDING')
    expect(out).toContain('export const GRID_WIDTH')
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
