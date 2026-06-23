# Fill-split spike — findings + decision (2026-06-23)

Spike for the narrow fill-split rule (`docs/superpowers/specs/2026-06-23-fill-split-rule-design.md`).
Validated on a fresh section-3 re-export (`figma-export-section3-v4`, root `Section_3 1:32191`, screen `1:33188`).

## Results

| Check | Outcome |
|---|---|
| `stats.split` | **12** nodes decomposed (claim button + progress bar across the screen) |
| Ground-truth render present | yes (`render/Section_3_1-32191.png`) — Task 1 render landed |
| Claim button still baked? | **No** — `Button_1-32314.png` is gone from the manifest (the remaining `Button_*.svg` is a different vector button) |
| Button now structural? | **Yes** — rebuilt scene has gradient `rect`s at the button box `{27,492,332,45}` (pill `radius` 61/46) + a separate coin `img` at `{277,507}` + text |
| Visual fidelity (rendered) | **Good** — renders as a faithful orange gradient pill + coin + "立即领取 5¥"; the progress bar above also reconstructs as a CSS gradient |
| Colour is data (recolour) | **Yes** — the button background is a CSS `linear/radial-gradient` in the scene JSON, editable; no longer locked in a PNG |

## Fidelity notes

- The reconstructed orange is **slightly lighter** than the baked original. Cause: the button layers a translucent white sheen over the orange base; `bgFromFills` composites both as stacked CSS gradient layers, which softens the result a touch. Acceptable — not a structural failure, and themeable.
- Geometry is faithful: pill radius, coin position, and text all land correctly. No shifted icon, no obvious lost shadow on this button.
- The progress bar (also split) reconstructs cleanly as a CSS gradient track.

## Decision: **WIDEN** (as a separate follow-up spec)

The narrow rule works cleanly and safely on simple pills/bars — exactly as designed, conservative, no regressions (12 nodes freed, everything else bakes as before). The bigger prize remains the **12 baked reward cards**, which the mask/boolean guard currently excludes.

Recommend a follow-up spec to handle the reward-card case: a gradient/solid card background whose silhouette is a `Subtract`/mask shape, with a coin-icon group child. That needs:
- reconstructing the masked silhouette (rounded card + the notch) as CSS or a separate vector, rather than the simple `cornerRadius` rect this spike relies on, and
- confirming the multi-image coin group decomposes without overlap.

Until then, the narrow rule ships as-is: themeable buttons/bars, zero risk to everything else.

## Repo state

Spike used throwaway artifacts only (`figma-export-section3-v4/`, a temporary scene/asset swap into the Section 3 tab) — all reverted; working tree clean. The only committed change from this work is the plugin rule (Task 1) + this note.
