# Figma → React Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Vite + React + Tailwind workspace with a reusable component kit and a reuse-enforcing workflow, then compose the 波币大闯关 theme1 screen by reusing that kit.

**Architecture:** Static presentational React components styled with Tailwind v4 (tokens declared in CSS `@theme`). A 5-component kit (`Button`, `TabSwitch`, `StatusIcon`, `Banner`, `RewardCard`) is built from structured Figma MCP data, then a screen composes them. Reuse is enforced by `CLAUDE.md` rules + a `docs/components.map.md` mapping (lightweight Code Connect).

**Tech Stack:** Vite, React 19, TypeScript, Tailwind v4 (`@tailwindcss/vite`), class-variance-authority (CVA), clsx + tailwind-merge, Vitest + React Testing Library.

**Deviations from spec (locked in here):** Tailwind **v4** → tokens live in a CSS `@theme` block in `src/index.css`, not a `tailwind.config.ts`. Component variants expose a `data-variant` attribute so tests assert behavior, not Tailwind class strings.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `package.json` | deps + scripts |
| `vite.config.ts` | Vite + React + Tailwind plugin + Vitest config |
| `tsconfig.json` / `tsconfig.node.json` | TS config |
| `index.html` | app entry HTML |
| `src/main.tsx` | React mount |
| `src/App.tsx` | renders the screen |
| `src/index.css` | Tailwind import + `@theme` tokens |
| `src/lib/cn.ts` | `clsx` + `tailwind-merge` helper |
| `src/test/setup.ts` | jest-dom setup for Vitest |
| `src/components/<Name>/<Name>.tsx` | one kit component each |
| `src/components/<Name>/<Name>.test.tsx` | co-located unit test |
| `src/screens/BobiLevelTheme1/BobiLevelTheme1.tsx` | composed screen |
| `assets/figma/` | captured screenshot + design-context dump |
| `CLAUDE.md` | reuse rules |
| `docs/workflow.md` | pipeline writeup + readable-vs-binary demo |
| `docs/components.map.md` | Figma layer ↔ code component map |

---

## Phase A — Project scaffold

### Task 1: Dependencies

**Files:**
- Create: `package.json`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "figma-learning",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwind-merge": "^2.6.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^25.0.1",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.2",
    "vite": "^6.0.0",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Install**

Run: `npm install`
Expected: completes, `node_modules/` created, no peer-dep errors that block.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add dependencies"
```

### Task 2: Config + entry files

**Files:**
- Create: `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/lib/cn.ts`

- [ ] **Step 1: `vite.config.ts`** (Vite + React + Tailwind + Vitest)

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

- [ ] **Step 2: `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noEmit": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Figma Learning</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: `src/index.css`** (Tailwind v4 + placeholder token block — real values filled in Task 7)

```css
@import "tailwindcss";

@theme {
  /* Tokens are refined in Task 7 from get_variable_defs.
     These defaults keep the app rendering before the MCP read. */
  --color-primary: #ff5a1f;
  --color-surface: #ffffff;
  --radius-card: 16px;
}
```

- [ ] **Step 6: `src/lib/cn.ts`**

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 7: `src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 8: `src/App.tsx`** (placeholder until screen exists)

```tsx
export default function App() {
  return <div className="p-4">Figma Learning — scaffold ready</div>
}
```

- [ ] **Step 9: Verify dev build compiles**

Run: `npm run build`
Expected: PASS (tsc + vite build succeed, `dist/` produced).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold vite + react + tailwind v4"
```

### Task 3: Test harness

**Files:**
- Create: `src/test/setup.ts`, `src/lib/cn.test.ts`

- [ ] **Step 1: `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 2: Write failing test `src/lib/cn.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })
  it('dedupes conflicting tailwind classes (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })
})
```

- [ ] **Step 3: Run test**

Run: `npm test`
Expected: PASS (2 tests). Confirms Vitest + jsdom + setup wired.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test: add vitest harness + cn util test"
```

### Task 4: Reuse-enforcement docs

**Files:**
- Create: `CLAUDE.md`, `docs/components.map.md`, `docs/workflow.md`

- [ ] **Step 1: `CLAUDE.md`**

```markdown
# figma_learning — working rules

## Component reuse (CRITICAL — this project exists to prove this)
Before building ANY screen or UI:
1. Check `src/components/` for an existing component.
2. Check `docs/components.map.md` for the Figma layer-name → component mapping.
3. REUSE existing components and their prop APIs. Extend with a new variant
   rather than creating a parallel component.
4. Only create a new component if none exists. If you do, add it to
   `docs/components.map.md`.

## Styling
- Use Tailwind v4 tokens from `src/index.css` `@theme` (e.g. `bg-primary`).
- NEVER hardcode hex/spacing (no `bg-[#ff5a1f]`). If a token is missing, add it
  to `@theme` first.

## Code style
- Small, focused files; one component per folder; immutable props-in/JSX-out.
- TDD: co-located `*.test.tsx`, assert behavior via `data-variant`, not classes.
```

- [ ] **Step 2: `docs/components.map.md`** (seeded; filled as components are built)

```markdown
# Figma → Code component map

Lightweight stand-in for Figma Code Connect. When the MCP returns a Figma
instance whose name matches the left column, reuse the right-column component.

| Figma layer name      | Code component | Key props |
|-----------------------|----------------|-----------|
| `Button`              | `<Button>`     | _TBD Task 8_ |
| `Tab switch`          | `<TabSwitch>`  | _TBD Task 9_ |
| `Status Icon`         | `<StatusIcon>` | _TBD Task 10_ |
| `Bobi Level_banner`   | `<Banner>`     | _TBD Task 11_ |
| `Reward Card`         | `<RewardCard>` | _TBD Task 12_ |
```

- [ ] **Step 3: `docs/workflow.md`** (seeded; demo section filled in Task 16)

```markdown
# Figma → React workflow

The reuse-enforcing pipeline this repo demonstrates. See
`docs/superpowers/specs/2026-06-10-figma-to-react-pipeline-design.md` for rationale.

1. Read STRUCTURED data via Figma MCP (never a `.fig` binary or bare screenshot).
2. Build a shared component kit once; wire tokens into Tailwind `@theme`.
3. Enforce reuse via `CLAUDE.md` + `docs/components.map.md`.
4. Compose screens from the kit.

## Readable structured data vs the `.fig` binary
_Filled in Task 16._
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: add reuse rules, component map, workflow"
```

---

## Phase B — Capture structured design data (MCP reads)

> These tasks spend the ~3 MCP reads. Use the already-cached `get_metadata`
> for structure. If any read's output is too large for context, it auto-spills
> to a file under the session tool-results dir — query it with `jq`/`python`,
> do NOT re-read.

### Task 5: Capture the screenshot (Read 1)

**Files:**
- Create: `assets/figma/bobi-theme1.png` (reference only)

- [ ] **Step 1: Call MCP**

Call `mcp__figma-remote-mcp__get_screenshot` with `fileKey=Kzxlo4FmH0RzgnZqhZc3In`, `nodeId=1:969`.
Expected: an image of the 波币大闯关 theme1 screen. Save/note it as the visual target.

- [ ] **Step 2: Commit any saved asset**

```bash
git add assets/figma/ 2>/dev/null; git commit -m "chore: capture theme1 reference screenshot" || true
```

### Task 6: Capture design context (Read 2)

**Files:**
- Create: `assets/figma/bobi-theme1.context.json`

- [ ] **Step 1: Call MCP**

Call `mcp__figma-remote-mcp__get_design_context` with `fileKey=Kzxlo4FmH0RzgnZqhZc3In`, `nodeId=1:969`, `clientFrameworks=react`, `clientLanguages=typescript,css`.
Expected: structured layout/CSS + named component instances for the screen.

- [ ] **Step 2: If output spilled to a file, probe it**

Run: `jq 'type, length' <spilled-file>` then extract the relevant slices (per-component styling: Button, Tab switch, Status Icon, Banner, Reward Card).
Save a trimmed copy to `assets/figma/bobi-theme1.context.json` for reference.

- [ ] **Step 3: Commit**

```bash
git add assets/figma/bobi-theme1.context.json
git commit -m "chore: capture theme1 design context"
```

### Task 7: Capture + wire tokens (Read 3)

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Call MCP**

Call `mcp__figma-remote-mcp__get_variable_defs` with `fileKey=Kzxlo4FmH0RzgnZqhZc3In`, `nodeId=1:969`.
Expected: named variables (colors, spacing, radius, typography).

- [ ] **Step 2: Replace the placeholder `@theme` block in `src/index.css`**

Map each Figma variable to a Tailwind v4 token. Example shape (use REAL values
from Step 1):

```css
@theme {
  --color-primary: <from figma>;
  --color-primary-dark: <from figma>;
  --color-surface: <from figma>;
  --color-text: <from figma>;
  --color-step-locked: <from figma>;
  --color-step-active: <from figma>;
  --color-step-done: <from figma>;
  --radius-card: <from figma>;
  --radius-pill: <from figma>;
}
```

- [ ] **Step 3: Verify build still compiles**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "feat: wire figma design tokens into tailwind theme"
```

---

## Phase C — Build the component kit (TDD)

> For each component: write a behavior test, see it fail, implement minimal CVA
> component, see it pass, commit. Refine Tailwind classes to match
> `bobi-theme1.context.json`. Tests assert `data-variant` + content, never exact
> class strings, so visual refinement never breaks them.

### Task 8: Button

**Files:**
- Create: `src/components/Button/Button.tsx`, `src/components/Button/Button.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renders its children', () => {
    render(<Button>Claim</Button>)
    expect(screen.getByRole('button', { name: 'Claim' })).toBeInTheDocument()
  })

  it('defaults to the primary variant', () => {
    render(<Button>Go</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'primary')
  })

  it('applies the disabled variant when disabled', () => {
    render(<Button disabled>Locked</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('data-variant', 'disabled')
  })
})
```

- [ ] **Step 2: Run → fails**

Run: `npm test -- Button`
Expected: FAIL (`Button` not found).

- [ ] **Step 3: Implement**

```tsx
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

const button = cva(
  'inline-flex items-center justify-center rounded-pill font-semibold transition active:scale-95',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white',
        secondary: 'bg-surface text-primary border border-primary',
        disabled: 'bg-gray-300 text-gray-500 cursor-not-allowed',
      },
      size: { md: 'h-10 px-5 text-sm', lg: 'h-12 px-6 text-base' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button>

export function Button({ className, variant, size, disabled, ...props }: ButtonProps) {
  const resolved = disabled ? 'disabled' : (variant ?? 'primary')
  return (
    <button
      data-variant={resolved}
      disabled={disabled}
      className={cn(button({ variant: resolved, size }), className)}
      {...props}
    />
  )
}
```

- [ ] **Step 4: Run → passes**

Run: `npm test -- Button`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/Button/
git commit -m "feat: add Button component"
```

### Task 9: TabSwitch

**Files:**
- Create: `src/components/TabSwitch/TabSwitch.tsx`, `src/components/TabSwitch/TabSwitch.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TabSwitch } from './TabSwitch'

const tabs = [
  { id: 'a', label: 'Tab A' },
  { id: 'b', label: 'Tab B' },
]

describe('TabSwitch', () => {
  it('renders all tabs', () => {
    render(<TabSwitch tabs={tabs} active="a" onChange={() => {}} />)
    expect(screen.getByRole('tab', { name: 'Tab A' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Tab B' })).toBeInTheDocument()
  })

  it('marks the active tab', () => {
    render(<TabSwitch tabs={tabs} active="b" onChange={() => {}} />)
    expect(screen.getByRole('tab', { name: 'Tab B' })).toHaveAttribute('data-variant', 'active')
    expect(screen.getByRole('tab', { name: 'Tab A' })).toHaveAttribute('data-variant', 'inactive')
  })

  it('fires onChange with the tab id', () => {
    const onChange = vi.fn()
    render(<TabSwitch tabs={tabs} active="a" onChange={onChange} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Tab B' }))
    expect(onChange).toHaveBeenCalledWith('b')
  })
})
```

- [ ] **Step 2: Run → fails**

Run: `npm test -- TabSwitch`
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
import { cn } from '../../lib/cn'

export interface Tab {
  id: string
  label: string
}

interface TabSwitchProps {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
  className?: string
}

export function TabSwitch({ tabs, active, onChange, className }: TabSwitchProps) {
  return (
    <div role="tablist" className={cn('inline-flex gap-1 rounded-pill bg-surface p-1', className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            data-variant={isActive ? 'active' : 'inactive'}
            onClick={() => onChange(tab.id)}
            className={cn(
              'h-9 rounded-pill px-4 text-sm font-medium transition',
              isActive ? 'bg-primary text-white' : 'text-text/60',
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run → passes**

Run: `npm test -- TabSwitch`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/TabSwitch/
git commit -m "feat: add TabSwitch component"
```

### Task 10: StatusIcon

**Files:**
- Create: `src/components/StatusIcon/StatusIcon.tsx`, `src/components/StatusIcon/StatusIcon.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusIcon } from './StatusIcon'

describe('StatusIcon', () => {
  it('exposes its status as data-variant', () => {
    render(<StatusIcon status="active" />)
    expect(screen.getByRole('img', { name: /active/i })).toHaveAttribute('data-variant', 'active')
  })

  it('supports locked and done statuses', () => {
    const { rerender } = render(<StatusIcon status="locked" />)
    expect(screen.getByRole('img')).toHaveAttribute('data-variant', 'locked')
    rerender(<StatusIcon status="done" />)
    expect(screen.getByRole('img')).toHaveAttribute('data-variant', 'done')
  })
})
```

- [ ] **Step 2: Run → fails**

Run: `npm test -- StatusIcon`
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'

const icon = cva('grid size-[51px] place-items-center rounded-full text-xs font-bold', {
  variants: {
    status: {
      locked: 'bg-step-locked text-white/70',
      active: 'bg-step-active text-white',
      done: 'bg-step-done text-white',
    },
  },
  defaultVariants: { status: 'locked' },
})

interface StatusIconProps extends VariantProps<typeof icon> {
  status: 'locked' | 'active' | 'done'
  className?: string
}

const glyph: Record<string, string> = { locked: '🔒', active: '★', done: '✓' }

export function StatusIcon({ status, className }: StatusIconProps) {
  return (
    <span
      role="img"
      aria-label={`step ${status}`}
      data-variant={status}
      className={cn(icon({ status }), className)}
    >
      {glyph[status]}
    </span>
  )
}
```

- [ ] **Step 4: Run → passes**

Run: `npm test -- StatusIcon`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/StatusIcon/
git commit -m "feat: add StatusIcon component"
```

### Task 11: Banner

**Files:**
- Create: `src/components/Banner/Banner.tsx`, `src/components/Banner/Banner.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Banner } from './Banner'

describe('Banner', () => {
  it('renders the title', () => {
    render(<Banner title="波币大闯关" />)
    expect(screen.getByText('波币大闯关')).toBeInTheDocument()
  })

  it('renders an image when src is given', () => {
    render(<Banner title="x" imageSrc="/banner.png" />)
    expect(screen.getByRole('img')).toHaveAttribute('src', '/banner.png')
  })
})
```

- [ ] **Step 2: Run → fails**

Run: `npm test -- Banner`
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
import { cn } from '../../lib/cn'

interface BannerProps {
  title: string
  imageSrc?: string
  className?: string
}

export function Banner({ title, imageSrc, className }: BannerProps) {
  return (
    <header className={cn('relative h-[240px] w-full overflow-hidden', className)}>
      {imageSrc && (
        <img src={imageSrc} alt={title} className="absolute inset-0 size-full object-cover" />
      )}
      <h1 className="relative z-10 px-4 pt-6 text-xl font-bold text-white drop-shadow">
        {title}
      </h1>
    </header>
  )
}
```

- [ ] **Step 4: Run → passes**

Run: `npm test -- Banner`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/Banner/
git commit -m "feat: add Banner component"
```

### Task 12: RewardCard

**Files:**
- Create: `src/components/RewardCard/RewardCard.tsx`, `src/components/RewardCard/RewardCard.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RewardCard } from './RewardCard'

describe('RewardCard', () => {
  it('renders label and amount', () => {
    render(<RewardCard label="Bonus" amount="88" />)
    expect(screen.getByText('Bonus')).toBeInTheDocument()
    expect(screen.getByText('88')).toBeInTheDocument()
  })

  it('marks claimed state via data-variant', () => {
    render(<RewardCard label="x" amount="1" claimed />)
    expect(screen.getByTestId('reward-card')).toHaveAttribute('data-variant', 'claimed')
  })
})
```

- [ ] **Step 2: Run → fails**

Run: `npm test -- RewardCard`
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
import { cn } from '../../lib/cn'

interface RewardCardProps {
  label: string
  amount: string
  claimed?: boolean
  className?: string
}

export function RewardCard({ label, amount, claimed = false, className }: RewardCardProps) {
  return (
    <div
      data-testid="reward-card"
      data-variant={claimed ? 'claimed' : 'unclaimed'}
      className={cn(
        'flex flex-col items-center gap-1 rounded-card bg-surface p-3 shadow',
        claimed && 'opacity-60',
        className,
      )}
    >
      <span className="text-2xl font-extrabold text-primary">{amount}</span>
      <span className="text-xs text-text/70">{label}</span>
    </div>
  )
}
```

- [ ] **Step 4: Run → passes**

Run: `npm test -- RewardCard`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/RewardCard/
git commit -m "feat: add RewardCard component"
```

### Task 13: Finalize the component map

**Files:**
- Modify: `docs/components.map.md`

- [ ] **Step 1: Replace the `_TBD_` prop cells with real prop APIs**

```markdown
| Figma layer name      | Code component | Key props |
|-----------------------|----------------|-----------|
| `Button`              | `<Button>`     | `variant: primary\|secondary\|disabled`, `size: md\|lg` |
| `Tab switch`          | `<TabSwitch>`  | `tabs: {id,label}[]`, `active`, `onChange` |
| `Status Icon`         | `<StatusIcon>` | `status: locked\|active\|done` |
| `Bobi Level_banner`   | `<Banner>`     | `title`, `imageSrc?` |
| `Reward Card`         | `<RewardCard>` | `label`, `amount`, `claimed?` |
```

- [ ] **Step 2: Commit**

```bash
git add docs/components.map.md
git commit -m "docs: finalize component map prop APIs"
```

---

## Phase D — Compose the screen (reusing the kit)

### Task 14: BobiLevelTheme1 screen

**Files:**
- Create: `src/screens/BobiLevelTheme1/BobiLevelTheme1.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Implement the screen by composing ONLY kit components**

Drive layout from `assets/figma/bobi-theme1.context.json`. Import `Banner`,
`TabSwitch`, `StatusIcon`, `RewardCard`, `Button` — create NO new primitives
(per `CLAUDE.md`). Screen-specific wrappers (e.g. a `StepRow`) may be defined
locally in this file. Skeleton:

```tsx
import { useState } from 'react'
import { Banner } from '../../components/Banner/Banner'
import { TabSwitch } from '../../components/TabSwitch/TabSwitch'
import { StatusIcon } from '../../components/StatusIcon/StatusIcon'
import { RewardCard } from '../../components/RewardCard/RewardCard'
import { Button } from '../../components/Button/Button'

const steps = [
  { id: 1, status: 'done' as const, title: 'Step 1', amount: '8' },
  { id: 2, status: 'active' as const, title: 'Step 2', amount: '18' },
  { id: 3, status: 'locked' as const, title: 'Step 3', amount: '88' },
]

export function BobiLevelTheme1() {
  const [tab, setTab] = useState('progress')
  return (
    <div className="mx-auto flex min-h-screen w-[390px] flex-col bg-surface">
      <Banner title="波币大闯关" />
      <div className="flex justify-center py-3">
        <TabSwitch
          tabs={[{ id: 'progress', label: '闯关' }, { id: 'rules', label: '规则' }]}
          active={tab}
          onChange={setTab}
        />
      </div>
      <ol className="flex flex-col gap-3 px-4">
        {steps.map((s) => (
          <li key={s.id} className="flex items-center gap-3 rounded-card bg-surface p-3 shadow">
            <StatusIcon status={s.status} />
            <span className="flex-1 font-medium">{s.title}</span>
            <RewardCard label="奖励" amount={s.amount} claimed={s.status === 'done'} />
            <Button disabled={s.status === 'locked'}>领取</Button>
          </li>
        ))}
      </ol>
    </div>
  )
}
```

- [ ] **Step 2: Render it in `src/App.tsx`**

```tsx
import { BobiLevelTheme1 } from './screens/BobiLevelTheme1/BobiLevelTheme1'

export default function App() {
  return <BobiLevelTheme1 />
}
```

- [ ] **Step 3: Verify build + tests**

Run: `npm run build && npm test`
Expected: build PASS, all component tests PASS.

- [ ] **Step 4: Visual check vs screenshot**

Run: `npm run dev`, open the local URL, compare against `assets/figma/bobi-theme1.png`.
Refine Tailwind classes (spacing/colors via tokens only) until close. Re-run `npm test` after refinements (must stay green).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: compose BobiLevelTheme1 screen from kit"
```

---

## Phase E — Demo writeup

### Task 15: Readable-vs-binary section

**Files:**
- Modify: `docs/workflow.md`

- [ ] **Step 1: Fill the demo section**

Paste a trimmed excerpt of `assets/figma/bobi-theme1.context.json` (showing
named components + tokens the model CAN read) and contrast with the `.fig`
binary (unreadable). State the conclusion: structured data → reuse; binary →
reinvention. Reference which kit components the screen reused.

- [ ] **Step 2: Commit**

```bash
git add docs/workflow.md
git commit -m "docs: add readable-data vs .fig binary demo"
```

---

## Self-Review

**Spec coverage:**
- §2 scaffold → Tasks 1–3 ✓
- §2 CLAUDE.md + docs → Task 4 ✓
- §2 5-component kit + tokens + tests → Tasks 7–13 ✓
- §2 theme1 screen reusing kit → Task 14 ✓
- §2 readable-vs-binary writeup → Task 15 ✓
- §4 MCP read plan (3 reads) → Tasks 5–7 ✓
- §5 reuse mechanism (CLAUDE.md, map, tokens) → Tasks 4, 7, 13 ✓
- §6 Vitest unit tests → Tasks 3, 8–12 ✓

**Placeholder scan:** `_TBD_` cells in `docs/components.map.md` are intentionally
seeded in Task 4 and resolved in Task 13. Token `<from figma>` values in Task 7
are filled from the live MCP read (cannot be known before execution). All code
steps contain complete code.

**Type consistency:** `StatusIcon.status` union (`locked|active|done`) matches
its use in Task 14. `Tab` shape (`{id,label}`) matches TabSwitch usage. `Button`
`variant`/`size` unions consistent. `RewardCard` props (`label,amount,claimed`)
consistent across Tasks 12 and 14.
