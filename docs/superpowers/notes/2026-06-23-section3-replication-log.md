# Section 3 Replication Log — 2026-06-23

Calibration run of the `replicate-screen` skill on Section 3 (点击领取 / click-to-claim).
Screen node: `1:33188`, frame name `opt1_点击领取 theme6`, 390×2076px.

## Interim Reference Note

This export predates the plugin's render feature, so `figma-export-section3-v3/render/` does NOT exist.
The visual diff used the existing baked `点击领取` tab (`page-tab-section3`) as an **interim reference (baked scene)**.
This comparison is inherently circular: both versions share the same asset files (Banner, reward card PNGs, activity table SVG).
The diff ratio reflects layout differences (flow vs absolute positioning), not fidelity to a true ground-truth render.

## Per-Region Disposition Table

| Figma Region | Role (IR) | Box (x,y,w,h) | Disposition | Source Component / Justification |
|---|---|---|---|---|
| Frame 1410102067 (nav bar) | layout | 0,0,390x84 | **REUSE** | `<NavHeader title="逢6必发" />` — matches `Frame 1410102067` row in components.map.md |
| Banner (Bobi Level_banner) | component | 0,84,390x256 | **BAKE** | `<img src=Banner_1-33253.png>` — genuine art (mascot + gradient BG), no live text |
| Status bar contents (time/battery) | asset/content | 0,0,390x49 | **BAKE** | Baked into NavHeader's reserved spacer zone; no live hardware data |
| Group 1410107148/1410107166 (decorative ribbon) | asset | 356,185,34x81 | **BAKE** | Scene-renderer-level decorative SVG overlaid on banner; omitted in component build — art |
| Frame 1410162775 (progress card) | interactive/layout | 7,335,375x218 | **CREATE** `<ProgressCard>` | Structured UI: 3 stat columns + progress bar + 立即领取 button; no existing component matched. Added to components.map.md. |
| Rectangle 346249805 (progress card BG) | interactive | 19,335,354x167 | absorbed into ProgressCard | Background shape for progress card container |
| Frame 1410162740 (stats + button row) | layout | 7,387,372x163 | absorbed into ProgressCard | Inner stat columns and claim button |
| Button 立即领取 | interactive | 27,492,332x45 | absorbed into ProgressCard | Interactive button — ProgressCard exposes `onClaim` callback |
| Subtract decorative shapes (top-left/right of card) | asset | 213,339,160x68 & 25,339,160x68 | **OMITTED** | Decorative tab-shapes for progress card corners; too detailed to reproduce cleanly without exact SVG; gap noted |
| Frame 1410162776 (reward preview section) | layout | 7,554,375x449 | structure | Container — handled inline in screen |
| image 1253653 (mascot sprite) | asset | 282,550,80x80 | **OMITTED** | Small decorative mascot sprite floating above reward card container; art |
| Frame 1410162768 (奖励预览 header) | asset+content | 18,575,138x40 | **REUSE** `<SectionHeader>` | Uses `<SectionHeader title="奖励预览" />` — same heading pill style, section2 star decor |
| Frame 1410162753 (12 reward cards) | component | 17,615,356x382 | **BAKE images + CREATE** `<RewardGrid>` | Card art (coin icons) is genuine art → BAKE individual PNGs; grid layout → CREATE `<RewardGrid>`. Added to components.map.md. |
| Reward Card instances (×12) | component | 27,627…282,869 | **BAKE** | Each card is an exported PNG with coin icon art; existing `<RewardCard>` lacks icon support |
| Frame 1410162770 (活动详情 section) | layout | 7,1015,375x998 | structure | Container — handled inline in screen |
| Subtract decorative shapes (top corners) | asset | 164,1015,218x93 & 8,1015,218x93 | **OMITTED** | Decorative corner shapes; art |
| Frame 1410162768 (活动详情 header) | asset+content | 126,1022,138x40 | **REUSE** `<SectionHeader>` | `<SectionHeader title="活动详情" />` — same pill heading |
| Frame_1410162754 (rewards table) | asset | 17,1065,356x765 | **BAKE** | Large SVG with full table content baked as vector art; `<RewardTable>` expects structured column/row data incompatible with this table's format |
| Frame 1410162771 (活动细则 section) | layout | 17,1844,356x160 | structure | Container |
| Frame 1410162768 (活动细则 header) | asset+content | 126,1854,138x40 | **REUSE** `<SectionHeader>` | `<SectionHeader title="活动细则" />` |
| Frame 1410106216 (fine print text) | content | 27,1904,336x80 | **inline** | One-off paragraph; not worth a library component |
| Group 1410162696/1410162695 (bracket decorators) | asset | 45,993 & 336,993 | **OMITTED** | Decorative SVG brackets on sides of section header; art |
| Home Indicator | component | 1,2055,389x21 | **OMITTED** | Device UI element outside screen content area |

## Counts

| Disposition | Count |
|---|---|
| REUSE | 4 (NavHeader ×1, SectionHeader ×3) |
| CREATE | 2 (ProgressCard, RewardGrid) |
| BAKE | 14 (Banner, 12 reward card PNGs, activity table SVG) |
| OMITTED (decorative art/device UI) | 8 |

## Visual Diff Results

- **Reference**: interim baked scene (`page-tab-section3`, theme1 — SceneRenderer, absolute layout)
- **Replicated**: component-composed screen (`page-tab-section3r`, flow layout)
- **Sizes**: actual 390×2083, ref 390×2076 (7px height difference from bottom padding rendering)
- **Pixel diff ratio (cropped to min height)**: **0.30** (30%)
- **Diff interpretation**: The ratio is high because the comparison is baked-absolute vs component-flow, not against a true Figma render. Primary differences:
  1. Progress card area: decorative Subtract SVG shapes not replicated (missing corner chrome)
  2. Banner area: page tab bar positioning differs between views
  3. Activity table: minor x-offset from flow padding vs absolute position
  4. Reward cards: near-identical (both use same PNGs)
- **Convergence**: No further iteration was viable — the structural layout gap between absolute and flow rendering is systematic. The ratio reflects this architectural difference, not individual fixable pixels.

## Files Created / Modified

### New files
- `src/components/ProgressCard/ProgressCard.tsx` — new component
- `src/components/ProgressCard/ProgressCard.test.tsx` — 8 tests (unclaimed/claimed states, onClaim callback, progress bar, button disabled)
- `src/components/RewardGrid/RewardGrid.tsx` — new component
- `src/components/RewardGrid/RewardGrid.test.tsx` — 4 tests (data-variant, 12 images, current badge, alt text)
- `src/screens/Section3Replicated/Section3Replicated.tsx` — replicated screen with mock interaction
- `src/screens/Section3Replicated/Section3Replicated.test.tsx` — 8 tests (nav header, progress card states, claim interaction, reward grid, 12 cards, current badge)

### Modified files
- `src/App.tsx` — added Section3Replicated import, `section3r` page entry, render branch
- `docs/components.map.md` — added ProgressCard and RewardGrid rows

## Test + TypeScript Results

```
npx vitest run → 137/137 tests passed (26 test files)
npx tsc -b     → exit 0 (no errors)
```

## SKILL.md Gaps Found

1. **No guidance on size-mismatched diffs**: `diffPngs` throws on size mismatch, but flow-layout components will almost always have slightly different heights from the baked reference (different font metrics, bottom padding). SKILL.md §4 says "run `node scripts/verify-screen.mjs`" but doesn't address this. Suggestion: add a note that the verify loop should crop to the minimum of the two heights when sizes are close (<10px), and that `verify-screen.mjs` should be updated to handle this.

2. **BAKE vs CREATE boundary unclear for icon-bearing cards**: The IR tags Figma Reward Card instances as `role="component"` with `key=1:40177` (etc.), which in the confidence ladder points to REUSE. But the existing `<RewardCard>` component doesn't match (it has no coin icon slot). The SKILL.md REUSE criteria ("Figma name/structure matches a row in docs/components.map.md") correctly rules this out (the name matches `Reward Card` but the props don't fit), but the next step — CREATE vs BAKE — is ambiguous when the art is genuinely complex (coin SVG + amount + requirement text in a styled pill). The skill says "prefer CREATE over BAKE whenever the region carries text or a token-able fill" but these cards have non-token-able art fills. Suggestion: add explicit guidance for "component instances whose chrome includes non-token-able icon art" → BAKE the card art, CREATE the grid wrapper.

3. **No explicit step for registering the page tab**: SKILL.md §3 says "Render the screen in the app" but gives no concrete instructions for how the app's routing works. Each repo has its own routing mechanism; for this repo it's `useState` + tabs with specific `data-testid` patterns. A gap phrase like "register the screen in the app's routing/navigation so the verify loop can reach it at a known URL or tab ID" with the test attribute requirement would make §4 actionable without needing the developer to read App.tsx.
