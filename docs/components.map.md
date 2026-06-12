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
| `Frame 1410107570` (rewards table, node `1:1197`) | `<RewardTable>` | 活动详情 rewards grid. Generic, data-driven: `columns: {id,label,align?}[]`, `rows: {id,cells:string[],highlight?}[]` (positional — `cells.length` must equal `columns.length` or it throws), `className?`. Teal header (`bg-table-header` + `text-table-header-text`), alternately striped body (`bg-table-stripe`/`bg-table-cell`), `#CACACA` cell borders (`border-table-border`), `rounded-table`; `highlight` rows render values in `text-table-highlight` (blue). Semantic `<table>`/`<th scope=col>`/`<td>`. `data-testid="reward-table"`; each `<tr data-testid="reward-row-<id>" data-stripe="odd\|even" data-highlight>`. |
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
