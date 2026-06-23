import { useState } from 'react'
import { SceneRenderer, type Scene } from '../../components/SceneRenderer/SceneRenderer'
import sceneData from './scene.json'

// Baked Section3Replicated assets — every decoration included by the scene.
const sceneUrls = import.meta.glob('./img/*', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const sceneByName: Record<string, string> = {}
for (const [p, u] of Object.entries(sceneUrls)) sceneByName[p.split('/').pop()!] = u

const scene = sceneData as Scene

// Claim-button bounding box from scene.json (the 立即领取 gradient pill).
// rect node: x=27 y=492 w=332 h=45
const CLAIM_BTN = { x: 27, y: 492, w: 332, h: 45 }

/**
 * Section 3 "点击领取" replicated screen — baked fidelity base (v2).
 *
 * Layer 0 (z-0): SceneRenderer renders the full 390×2076 baked scene with ALL
 * 96 nodes: header stars, side ribbons, floating mascot, banner, gradient
 * progress card, the 立即领取 pill, reward grid, table, and fine-print rules.
 * Nothing is omitted.
 *
 * Layer 1 (z-10): A single transparent interactive seam is overlaid exactly
 * over the baked 立即领取 button. Clicking it flips local `claimed` state and
 * shows a 已领取 badge. This is purely a demo seam — no network, no handler
 * passed in. Real integration = replace the local useState with a prop/callback.
 */
export function Section3Replicated({ className }: { className?: string }) {
  // Mock claim state — demo only, no network.
  const [claimed, setClaimed] = useState(false)

  return (
    <div
      data-testid="scene-root"
      className={className}
      style={{ position: 'relative', width: scene.width, height: scene.height }}
    >
      {/* z-0: Full baked scene — all 96 nodes, all decorations */}
      <SceneRenderer scene={scene} assetUrl={(f) => sceneByName[f]} />

      {/* z-10: Claim interaction seam over the baked 立即领取 button */}
      <button
        type="button"
        data-testid="claim-btn"
        data-variant={claimed ? 'claimed' : 'unclaimed'}
        aria-label={claimed ? '已领取' : '立即领取'}
        onClick={() => setClaimed(true)}
        disabled={claimed}
        style={{
          position: 'absolute',
          left: CLAIM_BTN.x,
          top: CLAIM_BTN.y,
          width: CLAIM_BTN.w,
          height: CLAIM_BTN.h,
          // Transparent so the baked gradient pill shows through.
          background: 'transparent',
          border: 'none',
          cursor: claimed ? 'not-allowed' : 'pointer',
          borderRadius: 61,
          zIndex: 10,
          // Show a claimed badge in the centre of the button region.
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Only render the badge when claimed — otherwise transparent. */}
        {claimed && (
          <span
            data-testid="claimed-badge"
            style={{
              background: 'rgba(0,0,0,0.55)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              borderRadius: 24,
              padding: '4px 18px',
              pointerEvents: 'none',
            }}
          >
            已领取
          </span>
        )}
      </button>
    </div>
  )
}
