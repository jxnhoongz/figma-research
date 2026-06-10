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
