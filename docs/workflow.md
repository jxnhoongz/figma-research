# Figma → React workflow

The reuse-enforcing pipeline this repo demonstrates. See
`docs/superpowers/specs/2026-06-10-figma-to-react-pipeline-design.md` for rationale.

1. Read STRUCTURED data via Figma MCP (never a `.fig` binary or bare screenshot).
2. Build a shared component kit once; wire tokens into Tailwind `@theme`.
3. Enforce reuse via `CLAUDE.md` + `docs/components.map.md`.
4. Compose screens from the kit.

## Readable structured data vs the `.fig` binary
_Filled in Task 16._
