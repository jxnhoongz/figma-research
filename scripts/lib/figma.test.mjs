import { describe, it, expect } from 'vitest'
import { exportable, area, hex, compositeFills, makeBox, findScreen, textStyle, textRuns, gradientCss } from './figma.mjs'

const solid = (r, g, b, opacity) => ({ type: 'SOLID', color: { r, g, b }, ...(opacity !== undefined ? { opacity } : {}) })

describe('gradientCss', () => {
  const whiteSheen = [
    { position: 0, color: { r: 1, g: 1, b: 1, a: 0.6 } },
    { position: 1, color: { r: 1, g: 1, b: 1, a: 0 } },
  ]

  it('radial: localises to the handle center + radii (no full-bleed wash)', () => {
    // Figma handles = [center, radius-handle-1, radius-handle-2]
    const css = gradientCss({
      type: 'GRADIENT_RADIAL',
      gradientStops: whiteSheen,
      gradientHandlePositions: [{ x: 0.571, y: 0.411 }, { x: 0.564, y: 1.049 }, { x: -0.433, y: 0.363 }],
    })
    // rx = max(|.564-.571|,|-.433-.571|)=1.004→100%, ry = max(|1.049-.411|,|.363-.411|)=.638→64%
    expect(css).toMatch(/^radial-gradient\(100% 64% at 57% 41%,/)
    expect(css).toContain('rgba(255, 255, 255, 0.600) 0%')
    expect(css).not.toContain('circle') // the bug was an unsized full-bleed circle
  })

  it('radial without handles falls back to a centered circle', () => {
    expect(gradientCss({ type: 'GRADIENT_RADIAL', gradientStops: whiteSheen })).toMatch(/^radial-gradient\(circle,/)
  })

  it('linear: angle derived from handles', () => {
    const css = gradientCss({
      type: 'GRADIENT_LINEAR',
      gradientStops: [{ position: 0, color: { r: 0, g: 0, b: 0, a: 1 } }, { position: 1, color: { r: 1, g: 1, b: 1, a: 1 } }],
      gradientHandlePositions: [{ x: 0, y: 0 }, { x: 0, y: 1 }],
    })
    expect(css).toMatch(/^linear-gradient\(180deg,/)
    expect(css).toContain('#000000 0%')
  })
})

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

const textNode = (over = {}) => ({
  characters: '28',
  style: { fontFamily: 'DIN Alternate', fontPostScriptName: 'DINAlternate-Bold', fontStyle: 'Bold', fontWeight: 700, fontSize: 20, textAlignHorizontal: 'CENTER', textAlignVertical: 'CENTER', letterSpacing: 0.5, lineHeightPx: 23.3 },
  fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.8, b: 0.82 } }],
  strokes: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
  strokeWeight: 1.44,
  ...over,
})

describe('textStyle', () => {
  it('captures the full text style incl. align V, spacing, line-height, stroke', () => {
    const s = textStyle(textNode())
    expect(s).toMatchObject({
      fontFamily: 'DIN Alternate', fontPostScriptName: 'DINAlternate-Bold', fontStyle: 'Bold',
      fontWeight: 700, fontSize: 20, align: 'center', alignVertical: 'center',
      letterSpacing: 0.5, lineHeight: 23, color: '#80ccd1',
    })
    expect(s.stroke).toEqual({ color: '#ffffff', width: 1.44 })
  })

  it('returns null stroke when there is no visible stroke', () => {
    expect(textStyle(textNode({ strokes: [] })).stroke).toBeNull()
  })
})

describe('textRuns', () => {
  it('returns null when every character is one colour', () => {
    expect(textRuns(textNode())).toBeNull()
  })

  it('splits per-character colour overrides into runs', () => {
    const n = textNode({
      characters: 'AB',
      characterStyleOverrides: [0, 7],
      styleOverrideTable: { 7: { fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }] } },
    })
    expect(textRuns(n)).toEqual([
      { text: 'A', color: '#80ccd1' },
      { text: 'B', color: '#ff0000' },
    ])
  })
})
