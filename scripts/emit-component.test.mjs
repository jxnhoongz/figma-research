import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildIR } from './build-ir.mjs'
import { extractComponent, genRewardsTs, genRewardCardTsx, genRewardGridTsx, valueKey, fieldKey, buildSlots } from './emit-component.mjs'

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

  it('emits a flex group slot for the auto-layout amount row', () => {
    const group = model.slots.find((s) => s.kind === 'group')
    expect(group).toBeTruthy()
    expect(group.direction).toBe('row')
    expect(group.gap).toBe(2)
    expect(group.x).toBe(10) // 30 (row) - 20 (card origin)
    expect(group.children.map((c) => c.key)).toEqual(['amount', 'currency'])
  })

  it('emits a top-level text slot for the requirement', () => {
    const req = model.slots.find((s) => s.kind === 'text' && s.key === 'requirement')
    expect(req).toBeTruthy()
    expect(req.style.fontWeight).toBe(400)
  })

  it('keys per-card fields from all text slots and exposes gridBox', () => {
    expect(model.items.map((i) => i.fields.amount)).toEqual(['28', '88', '188'])
    expect(model.items[0].fields.currency).toBe('¥')
    expect(model.items[0].fields.requirement).toBe('投注 5万+')
    expect(model.gridBox).toEqual({ x: 10, y: 60, w: 370, h: 120 })
  })
})

describe('buildSlots: only leaf text rows become flex groups', () => {
  // Mirrors the real reward card: a flex-VERTICAL column holding [icon, amountRow,
  // labelRow]. The icon is a non-text node the emitter skips. If the column itself
  // became a flex group, dropping the icon would collapse the stack and pull the
  // amount row up onto the icon. It must instead pass through so the rows keep
  // their real card-relative y (69, 94).
  const card = {
    box: { x: 0, y: 0, w: 80, h: 116 },
    children: [
      {
        role: 'layout', name: 'col', box: { x: 0, y: 17, w: 80, h: 91 },
        layout: { mode: 'flex', direction: 'column', gap: 0, justify: 'flex-start', align: 'center' },
        children: [
          { role: 'asset', name: 'icon', box: { x: 15, y: 17, w: 50, h: 50 }, asset: { src: 'icon.png' } },
          {
            role: 'layout', name: 'amountRow', box: { x: 0, y: 69, w: 80, h: 23 },
            layout: { mode: 'flex', direction: 'row', gap: 0, justify: 'center', align: 'flex-end' },
            children: [
              { role: 'content', name: 'amount', box: { x: 24, y: 69, w: 20, h: 23 }, content: { text: '28', style: {} } },
              { role: 'content', name: '¥', box: { x: 44, y: 75, w: 12, h: 17 }, content: { text: '¥', style: {} } },
            ],
          },
          {
            role: 'layout', name: 'labelRow', box: { x: 0, y: 94, w: 80, h: 14 },
            layout: { mode: 'flex', direction: 'row', gap: 0, justify: 'center', align: 'flex-start' },
            children: [
              { role: 'content', name: '投注', box: { x: 18, y: 94, w: 20, h: 14 }, content: { text: '投注', style: {} } },
              { role: 'content', name: '5万+', box: { x: 40, y: 94, w: 23, h: 14 }, content: { text: '5万+', style: {} } },
            ],
          },
        ],
      },
    ],
  }
  const slots = buildSlots(card, card.box, new Set(), { i: 0 })

  it('passes the column through — top-level slots are the two rows, not one collapsed group', () => {
    expect(slots.map((s) => s.kind)).toEqual(['group', 'group'])
  })

  it('keeps each row at its real card-relative y (no collapse onto the icon)', () => {
    expect(slots[0].y).toBe(69) // amount row stays below the icon, not pulled to 17
    expect(slots[1].y).toBe(94)
  })

  it('carries width + justify so the row centers in the card', () => {
    expect(slots[0].w).toBe(80)
    expect(slots[0].justify).toBe('center')
    expect(slots[0].align).toBe('flex-end')
    expect(slots[0].children.map((c) => c.key)).toEqual(['amount', 'currency'])
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
    const textSlot = model.slots.find((s) => s.kind === 'text') ||
      model.slots.flatMap((s) => s.kind === 'group' ? s.children : []).find((s) => s.kind === 'text')
    const s = textSlot.style
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
  it('rewards.ts exports gridBox and slotKeys', () => {
    const out = genRewardsTs(model)
    expect(out).toContain('export const gridBox =')
    expect(out).toContain('export const slotKeys')
    expect(out).toContain('"amount"') // a known slot key appears in slotKeys/data
  })

  it('rewards.ts exports a typed RewardItem array with the data', () => {
    const out = genRewardsTs(model)
    expect(out).toContain('export interface RewardItem')
    expect(out).toContain('export const rewards: RewardItem[]')
    expect(out).toContain('"amount": "28"')
    expect(out).toContain('chrome-Card_1-5.png')
  })

  it('RewardCard.tsx renders text + group slots and accepts slotOverrides', () => {
    const out = genRewardCardTsx(model)
    expect(out).toContain("from '../../../components/PositionedText/PositionedText'")
    expect(out).toContain('slotOverrides')
    expect(out).toContain("kind === 'group'") // group branch
    expect(out).toContain('<PositionedText')   // text branch
    expect(out).toContain('flexDirection')
  })

  it('RewardGrid.tsx maps items to RewardCard', () => {
    const out = genRewardGridTsx(model)
    expect(out).toContain('items.map')
    expect(out).toContain('<RewardCard')
  })
})
