// Screenshot a rendered screen and diff it against a ground-truth render.
// Usage: node scripts/verify-screen.mjs <url> <referencePng> <outDir>
import { chromium } from 'playwright'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { diffPngs } from './lib/visual-diff.mjs'

const [, , url, referencePng, outDir] = process.argv
if (!url || !referencePng || !outDir) {
  console.error('usage: verify-screen.mjs <url> <referencePng> <outDir>')
  process.exit(2)
}
const FAIL_RATIO = 0.05

const browser = await chromium.launch()
try {
  const page = await browser.newPage({ deviceScaleFactor: 2 })
  await page.goto(url, { waitUntil: 'networkidle' })
  const el = await page.waitForSelector('[data-testid="scene-root"]', { timeout: 10000 })
  const actual = await el.screenshot()
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'actual.png'), actual)
  const { ratio, changed, total, diffBuffer } = diffPngs(readFileSync(referencePng), actual)
  writeFileSync(join(outDir, 'diff.png'), diffBuffer)
  console.log(JSON.stringify({ ratio, changed, total }))
  process.exit(ratio > FAIL_RATIO ? 1 : 0)
} finally {
  await browser.close()
}
