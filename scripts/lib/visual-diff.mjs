// Pure pixel-diff of two PNG buffers — the objective gate for the
// replicate-screen verify loop. Wraps pixelmatch; no I/O, no Playwright.
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

export function diffPngs(aBuffer, bBuffer, { threshold = 0.1 } = {}) {
  const a = PNG.sync.read(aBuffer)
  const b = PNG.sync.read(bBuffer)
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(`diffPngs: size mismatch ${a.width}x${a.height} vs ${b.width}x${b.height}`)
  }
  const diff = new PNG({ width: a.width, height: a.height })
  const changed = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold })
  const total = a.width * a.height
  return { ratio: changed / total, changed, total, diffBuffer: PNG.sync.write(diff) }
}
