import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildIR } from './build-ir.mjs'

const fx = (f) => JSON.parse(readFileSync(join('scripts/__fixtures__', f), 'utf8'))
const doc = fx('reward-grid.structure.json').document
const manifest = fx('reward-grid.manifest.json')

// Depth-first collect of every IR node.
function flatten(node, acc = []) {
  acc.push(node)
  ;(node.children || []).forEach((c) => flatten(c, acc))
  return acc
}

describe('buildIR', () => {
  const ir = buildIR(doc, '1:1', manifest)
  const all = flatten(ir.root)

  it('normalises dimensions to the screen', () => {
    expect(ir.width).toBe(390)
    expect(ir.height).toBe(400)
    expect(ir.root.role).toBe('layout')
  })

  it('tags the background vector as an asset (baked), not layout', () => {
    const bg = all.find((n) => n.id === '1:2')
    expect(bg.role).toBe('asset')
    expect(bg.asset.src).toBe('png/bg-deco_1-2.png')
    expect(bg.children).toBeUndefined()
  })

  it('tags the title as content', () => {
    const title = all.find((n) => n.id === '1:3')
    expect(title.role).toBe('content')
    expect(title.content.text).toBe('奖励预览')
    expect(title.content.style.fontFamily).toBe('YouSheBiaoTiHei')
  })

  it('tags the grid as a flex-row layout', () => {
    const grid = all.find((n) => n.id === '1:4')
    expect(grid.role).toBe('layout')
    expect(grid.layout.mode).toBe('flex')
    expect(grid.layout.direction).toBe('row')
    expect(grid.layout.gap).toBe(10)
  })

  it('tags each card as a recurring component with baked asset + text content', () => {
    const cards = all.filter((n) => n.role === 'component' && n.component.key === 'C:1')
    expect(cards).toHaveLength(3)
    for (const c of cards) {
      expect(c.component.instanceCount).toBe(3)
      expect(c.asset.src).toMatch(/^png\/Card_/)
    }
    const amounts = all.filter((n) => n.role === 'content' && n.content.text.endsWith('¥')).map((n) => n.content.text)
    expect(amounts).toEqual(expect.arrayContaining(['28¥', '88¥', '188¥']))
  })

  it('tags the CTA instance as interactive (not component)', () => {
    const cta = all.find((n) => n.id === '1:8')
    expect(cta.role).toBe('interactive')
    expect(cta.interactive.kind).toBe('button')
    expect(cta.interactive.label).toBe('立即领取')
    expect(cta.asset.src).toBe('svg/Button_1-8.svg')
  })

  it('captures full text style + runs on content nodes', () => {
    const title = all.find((n) => n.id === '1:3')
    expect(title.role).toBe('content')
    expect(title.content.style).toMatchObject({
      fontFamily: 'YouSheBiaoTiHei', fontSize: 24, align: 'left', alignVertical: 'top',
    })
    expect(title.content.style).toHaveProperty('letterSpacing')
    expect(title.content.style).toHaveProperty('lineHeight')
    expect(title.content.style).toHaveProperty('stroke')
    expect(title.content).toHaveProperty('runs') // null for single-colour text
  })

  it('does NOT mistag the screen frame as interactive despite "领取" in its name', () => {
    expect(ir.root.role).toBe('layout')
  })
})
