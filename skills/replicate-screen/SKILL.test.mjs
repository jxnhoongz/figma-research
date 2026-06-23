import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const doc = readFileSync(join(__dirname, './SKILL.md'), 'utf8')

describe('replicate-screen SKILL.md', () => {
  it('has frontmatter name + description', () => {
    expect(doc).toMatch(/^---\nname: replicate-screen\n/)
    expect(doc).toMatch(/\ndescription: .+\n/)
  })

  it('documents the full procedure: inventory → ladder → seams → assemble → verify → mock', () => {
    for (const heading of [
      '## 1. Inventory',
      '## 2. Decide per region',
      '## 2b. Integration-ready seams',
      '## 3. Assemble',
      '## 4. Verify',
      '## 5. Mock interaction',
      '## 6. Output',
    ]) {
      expect(doc).toContain(heading)
    }
  })

  it('encodes the confidence ladder + reuse-first + tokens-not-hex rules', () => {
    expect(doc).toContain('REUSE')
    expect(doc).toContain('CREATE + REGISTER')
    expect(doc).toContain('BAKE')
    expect(doc).toMatch(/components\.map\.md/)
    expect(doc).toMatch(/@theme/)
    expect(doc).toMatch(/verify-screen\.mjs/)
  })
})
