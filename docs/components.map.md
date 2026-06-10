# Figma → Code component map

Lightweight stand-in for Figma Code Connect. When the MCP returns a Figma
instance whose name matches the left column, reuse the right-column component.

| Figma layer name      | Code component | Key props |
|-----------------------|----------------|-----------|
| `Button`              | `<Button>`     | `ButtonHTMLAttributes` + `variant?: 'primary'\|'secondary'\|'disabled'`, `size?: 'md'\|'lg'`. `disabled` forces resolved variant `disabled`. CSS-based (uses `.bg-cta` gradient) so text is dynamic. Exposes `data-variant`. |
| `Tab switch`          | `<TabSwitch>`  | `tabs: {id,label}[]`, `active: string`, `onChange: (id) => void`, `className?`. `role="tablist"`/`"tab"`, `aria-selected`; active tab uses `.bg-tab-active`. `data-variant` = `active`\|`inactive`. |
| `Status Icon`         | `<StatusIcon>` | `status: 'locked'\|'active'\|'done'\|'fail'` (4 states, rendered from real SVG assets), `className?`. Renders `<img role="img" aria-label="step <status>" data-variant={status}>` at `size-[51px]`. |
| `Bobi Level_banner`   | `<Banner>`     | `title?: string` (alt text only — art is baked into the PNG), `src?: string` (defaults to bundled `banner.png`), `className?`. Image-based `<header><img/></header>`. |
| `Reward Card`         | `<RewardCard>` | Generic label/amount card. `label: string`, `amount: string`, `claimed?: boolean`, `className?`. Brown label (`text-text-brown`), amount (`text-text-amount`), `rounded-card`, `.bg-card-grad`; claimed ⇒ reduced opacity. `data-testid="reward-card"`, `data-variant` = `claimed`\|`unclaimed`. |
