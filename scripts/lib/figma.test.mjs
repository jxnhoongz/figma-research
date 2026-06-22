import { describe, it, expect } from 'vitest'
import { exportable, area, hex, compositeFills, bgFromFills, makeBox, findScreen } from './figma.mjs'

const solid = (r, g, b, opacity) => ({ type: 'SOLID', color: { r, g, b }, ...(opacity !== undefined ? { opacity } : {}) })

describe('figma helpers', () => {
  it('hex formats a color', () => {
    expect(hex({ r: 1, g: 1, b: 1 })).toBe('#ffffff')
  })

  it('compositeFills layers a translucent black over a base (teal + 40% black -> darker teal)', () => {
    // #81ccd1 = (0.506, 0.8, 0.82)
    const c = compositeFills([solid(0.506, 0.8, 0.82), solid(0, 0, 0, 0.4)])
    expect(c).toBe('#4d7a7d')
  })

  it('compositeFills returns null when there are no solid fills', () => {
    expect(compositeFills([{ type: 'IMAGE' }])).toBeNull()
  })

  it('exportable rejects hidden and sub-pixel nodes', () => {
    expect(exportable({ visible: false, absoluteBoundingBox: { width: 10, height: 10 } })).toBe(false)
    expect(exportable({ absoluteBoundingBox: { width: 0.5, height: 10 } })).toBe(false)
    expect(exportable({ absoluteBoundingBox: { width: 10, height: 10 } })).toBe(true)
  })

  it('area multiplies the bounding box', () => {
    expect(area({ absoluteBoundingBox: { width: 4, height: 5 } })).toBe(20)
    expect(area({})).toBe(0)
  })

  it('bgFromFills picks the first visible non-image fill', () => {
    expect(bgFromFills({ fills: [solid(1, 0, 0)] })).toEqual({ bg: '#ff0000', opacity: 1 })
    expect(bgFromFills({ fills: [] })).toBeNull()
  })

  it('makeBox normalises to the given origin', () => {
    const box = makeBox(100, 200)
    expect(box({ absoluteBoundingBox: { x: 110, y: 220, width: 30, height: 40 } })).toEqual({ x: 10, y: 20, w: 30, h: 40 })
    expect(box({})).toBeNull()
  })

  it('findScreen matches by id or name', () => {
    const doc = { id: '0:0', children: [{ id: '1:1', name: 'A', children: [{ id: '1:2', name: 'Target' }] }] }
    expect(findScreen(doc, '1:2').name).toBe('Target')
    expect(findScreen(doc, 'A').id).toBe('1:1')
    expect(findScreen(doc, 'nope')).toBeNull()
  })
})
