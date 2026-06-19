import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SceneRenderer, type Scene } from './SceneRenderer'

const scene: Scene = {
  name: 'test',
  width: 100,
  height: 200,
  nodes: [
    { kind: 'rect', x: 0, y: 0, w: 100, h: 200, bg: '#81ccd1', opacity: 1, radius: 4 },
    { kind: 'img', x: 10, y: 20, w: 30, h: 30, src: 'logo.svg' },
    {
      kind: 'text',
      x: 5,
      y: 5,
      w: 40,
      h: 14,
      text: '活动详情',
      fontFamily: 'YouSheBiaoTiHei',
      fontSize: 12,
      fontWeight: 600,
      color: '#222',
      align: 'center',
      lineHeight: 14,
      letterSpacing: 0,
    },
  ],
}

describe('SceneRenderer', () => {
  it('sizes the canvas to the scene dimensions', () => {
    render(<SceneRenderer scene={scene} assetUrl={() => 'x'} />)
    const el = screen.getByTestId('scene')
    expect(el).toHaveStyle({ width: '100px', height: '200px' })
  })

  it('resolves img src through assetUrl and absolutely positions it', () => {
    render(<SceneRenderer scene={scene} assetUrl={(s) => `/cdn/${s}`} />)
    const img = document.querySelector('img')!
    expect(img.getAttribute('src')).toBe('/cdn/logo.svg')
    expect(img).toHaveStyle({ position: 'absolute', left: '10px', top: '20px' })
  })

  it('drops an img whose asset is unresolved instead of rendering a broken src', () => {
    render(<SceneRenderer scene={scene} assetUrl={() => undefined} />)
    expect(document.querySelector('img')).toBeNull()
  })

  it('renders single-line text with horizontal slack so it does not mis-wrap', () => {
    render(<SceneRenderer scene={scene} assetUrl={() => 'x'} />)
    const t = screen.getByTestId('scene-text')
    expect(t.textContent).toBe('活动详情')
    // slack = ceil(12 * 0.6) = 8 → width 40+8, left 5 - 4
    expect(t).toHaveStyle({ width: '48px', left: '1px' })
  })
})
