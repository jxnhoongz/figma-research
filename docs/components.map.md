# Figma → Code component map

Lightweight stand-in for Figma Code Connect. When the MCP returns a Figma
instance whose name matches the left column, reuse the right-column component.

| Figma layer name      | Code component | Key props |
|-----------------------|----------------|-----------|
| `Button`              | `<Button>`     | `ButtonHTMLAttributes` + `variant?: 'primary'\|'secondary'\|'disabled'`, `size?: 'md'\|'lg'`. `disabled` forces resolved variant `disabled`. CSS-based (uses `.bg-cta` gradient) so text is dynamic. Exposes `data-variant`. |
| `Tab switch`          | `<TabSwitch>`  | `tabs: {id,label}[]`, `active: string`, `onChange: (id) => void`, `className?`. `role="tablist"`/`"tab"`, `aria-selected`; active tab uses `.bg-tab-active`. `data-variant` = `active`\|`inactive`. |
| `Status Icon`         | `<StatusIcon>` | `status: 'locked'\|'active'\|'done'\|'fail'`, `className?`. Renders the REAL section2 SVG inline (`role="img"`, `aria-label="step <status>"`, `data-variant`). `done` (passed) carries the themeable accent (`currentColor`); `active`=gold star, `locked`/`fail`=grey (semantic, frozen). |
| `Bobi Level_banner`   | `<Banner>`     | `title?: string` (alt text only — art is baked into the PNG), `src?: string` (defaults to bundled `banner.png`), `className?`. Image-based `<header><img/></header>`. |
| `Reward Card`         | `<RewardCard>` | Generic label/amount card. `label: string`, `amount: string`, `claimed?: boolean`, `className?`. Brown label (`text-text-brown`), amount (`text-text-amount`), `rounded-card`, `.bg-card-grad`; claimed ⇒ reduced opacity. `data-testid="reward-card"`, `data-variant` = `claimed`\|`unclaimed`. |
| `Frame 1410102067` (nav bar) | `<NavHeader>` | White nav bar above the banner. `title: string`, `onBack?: () => void`, `className?`. Status-bar spacer + left back chevron (`aria-label="back"`) + centered navy title (`text-nav-title` = `#110940`). `data-testid="nav-header"`, `data-variant="with-statusbar"`. |
| `Frame 1410107570` (rewards table, node `1:1197`) | `<RewardTable>` | 活动详情 rewards grid. Generic, data-driven: `columns: {id,label,align?,width?}[]`, `rows: {id,cells:string[],highlightCells?:number[],highlight?}[]` (positional — `cells.length` must equal `columns.length` or it throws), `className?`. `width` (e.g. `'22.8%'`) renders a `<colgroup>` (Figma label col 80/350, value cols 45.5/350). Accent-driven header (`bg-table-header` → `var(--theme-accent)`) with white text; the striped body (`bg-table-stripe`) and cell borders (`border-table-border`) are `color-mix` tints of the same accent, so the WHOLE table recolors on theme switch (not just the header); `rounded-table`. **Highlight is per-CELL, not per-row** — `highlightCells` lists column indices to render in `text-table-highlight` (fixed blue #0943D5, fw-400); Figma highlights ONLY 第一关/2倍 (8元), node 1:1227. `highlight:true` is a convenience that lights up cell index 2. Semantic `<table>`/`<th scope=col>`/`<td>`. `data-testid="reward-table"`; each `<tr data-testid="reward-row-<id>" data-stripe="odd\|even" data-highlight>`; highlighted `<td data-highlight="true">`. |
| `Steps List` (frame `1:1020`, the 闯关排列 box) | `<StepsContainer>` | The frosted container frame that wraps ALL step cards. NOT a registered Figma component (a copy-pasted plain frame) — captured from the screen structure, not the master list. Props: `title: string` (header pill, 闯关排列), `children: ReactNode` (the `<li>` step cards), `className?`. Renders a frosted gradient box (`.bg-steps-container`, 3px `white/60` border, `rounded-card`) with the title pill straddling the top edge, the real serpentine map path (`<AllPieces>`) as an absolute `z-0` background layer, and the cards in a `z-10` `<ol>` overlapping it. `data-testid="steps-container"`. |
| `Component 38`        | `<StepCard>`   | The repeated STEP CARD (Figma id 1:5062), rendered with the REAL section2 SVG chrome as the card background (rounded body + map-path pointer tab + right reward wedge) and content overlaid. Props: `status`, `title`, `requirement`, `statusText`, `amount`, `side?: 'left'\|'right'` (which way the pointer tab juts), `active?`, `claimable?`, `claimed?`, `stats?: {label,value,unit?}[]`, `onClaim?`, `className?`. `passed` chrome carries the themeable accent (`currentColor`); `current`=orange active card with stats on the white panel; `locked`/`fail`=grey. `data-testid="step-card"`, `data-variant` = `active`\|`default`, `data-side`. |

## Theming + generated SVGs

The kit SVGs (status-icon, component-38, tab-switch, map-pattern) are converted
to themeable React components by `scripts/gen-svg-components.mjs` (output in
`src/components/svg/generated/`, re-exported from `src/components/svg/index.ts`).
The script swaps the accent slot `#9A41FE` → `currentColor` and namespaces all
SVG ids so multiple instances never collide. A parent that sets
`color: var(--theme-accent)` recolors every accent live. The 6 themes live in
`src/lib/themes.ts`; the screen takes a `themeId` prop and sets
`--theme-accent`/`--theme-bg` (also driving `--color-screen` + `--color-table-header`).
The switcher UI lives in `src/App.tsx`. Semantic colors (locked grey, current
gold, CTA orange) are baked into the SVGs and never theme.
