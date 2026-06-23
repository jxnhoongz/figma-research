import { describe, it, expect } from 'vitest'
import { PNG } from 'pngjs'
import { diffPngs } from './visual-diff.mjs'

// Build a solid-colour W×H PNG buffer.
function solid(w, h, [r, g, b]) {
  const png = new PNG({ width: w, height: h })
  for (let i = 0; i < w * h; i++) {
    png.data[i * 4] = r
    png.data[i * 4 + 1] = g
    png.data[i * 4 + 2] = b
    png.data[i * 4 + 3] = 255
  }
  return PNG.sync.write(png)
}
// Build a PNG that is `red` on the left half, `blue` on the right half.
function halfHalf(w, h) {
  const png = new PNG({ width: w, height: h })
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const left = x < w / 2
      png.data[i] = left ? 255 : 0
      png.data[i + 1] = 0
      png.data[i + 2] = left ? 0 : 255
      png.data[i + 3] = 255
    }
  return PNG.sync.write(png)
}

describe('diffPngs', () => {
  it('reports zero ratio for identical images', () => {
    const a = solid(4, 4, [255, 0, 0])
    const out = diffPngs(a, solid(4, 4, [255, 0, 0]))
    expect(out.ratio).toBe(0)
    expect(out.total).toBe(16)
  })

  it('reports the changed fraction for a half-changed image', () => {
    const out = diffPngs(solid(4, 4, [255, 0, 0]), halfHalf(4, 4))
    // right half (8 of 16 px) changed from red to blue
    expect(out.changed).toBe(8)
    expect(out.ratio).toBeCloseTo(0.5, 5)
    expect(out.diffBuffer.length).toBeGreaterThan(0)
  })

  it('throws on dimension mismatch naming both sizes', () => {
    expect(() => diffPngs(solid(4, 4, [0, 0, 0]), solid(8, 8, [0, 0, 0]))).toThrow(/4x4.*8x8/)
  })
})
