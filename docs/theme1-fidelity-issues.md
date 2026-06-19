# theme1 Fidelity Audit (JSON-grounded, 2026-06-19)

Read node-by-node from `src/assets/figma-plugin/theme1/structure/Frame_1410108374_1-971.json`
(NOT eyeballed). This is the fix spec.

## Headers
1. **闯关排列 + 活动详情 are the IDENTICAL component** and must render the same:
   `Star 25` (30×31 vector) + `Vector 2723` (69×12 stroke/ribbon underline) + text `#222222`
   (display face, 22px). Today they differ (闯关排列 has a chevron + generic `✦`; 活动详情 has
   only `✦`), and neither has the stroke underline.
   - NOTE: `Star 25` (930px²) + `Vector 2723` (828px²) are below the plugin's 1500px² export
     threshold, so they're NOT in our export. Approximate closely (5-point star + short rule) OR
     re-export with a lower threshold. Flag which.

## Tabs
2. **Active tab is 昨日闯关 (LEFT)** — bigger (184×53) with `Star 64/65` decorations.
   **今日闯关 (right) is inactive** (176×40, plain). Our build has the right tab active → FLIP.

## Steps module (Component 32)
3. **Cards do NOT overlap each other** — step blocks are `gap 10` (spaced). The `gap -20` is on
   Component 32 = the 闯关排列 *title* overlapping the steps top by 20px. Remove card overlap.
4. **8 step blocks** in `Overlay Content` (each 306×60); `Steps List` (364h) + `Component 32`
   (440h) both **CLIP** → ~5 visible. We render 4. Model the clip + show ~5.
5. **Status icon is always LEFT** — each block is horizontal `[Status Icon 51 | Step Block
   Content 245]`. The left/right alternation is the card's pointer tab (`Polygon 2`, 10×20) +
   the Component 38 left/right variant — NOT the icon. Don't alternate the icon.
6. **Active 第三关 card is the SAME 306×60 size** — just orange chrome + stats
   (日计充值 / 有效投) + 彩金28元. Don't oversize it.
7. **Claim Button Container (345×70, 可领取 3888元)** is a real separate button — keep it.

## Main Container
8. Behind tabs/title: a `bg` group (378×521) + a `Vector` (270×126) decorative graphic. Verify
   ours matches.

## Bottom (Frame 1410107935)
9. Headers per #1. One decorative `Vector` (135×143). **No gift+ingot pair** exists in theme1 —
   if our build still has gift/ingot PNGs, remove them.

## Method note
The recurring error was approximating where we should mirror. For every value, read the JSON.
