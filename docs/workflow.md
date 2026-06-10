# Figma → React workflow

The reuse-enforcing pipeline this repo demonstrates. See
`docs/superpowers/specs/2026-06-10-figma-to-react-pipeline-design.md` for rationale.

## The pipeline

1. **Read STRUCTURED data** via a Figma MCP — never a `.fig` binary or a bare
   screenshot. Structured data carries component names + design tokens; a `.fig`
   is opaque bytes and a screenshot is just pixels.
2. **Export real artwork** as assets (`download_figma_images`): SVG for
   icons/vectors, PNG@3x for illustrations. Rebuild only the *chrome* in code.
3. **Build a shared component kit once**; wire tokens into Tailwind `@theme`
   (no hardcoded hex/gradient anywhere).
4. **Enforce reuse** via `CLAUDE.md` + `docs/components.map.md` (lightweight
   Code Connect): the model checks the kit before generating anything.
5. **Compose screens** from the kit — primitives are reused, never reinvented.

## Tooling note: escape the 6/month wall

The hosted Figma MCP is capped at **6 reads/month on Starter**. The
open-source **Framelink** MCP (`figma-developer-mcp`) uses a free Personal
Access Token + the REST API → **~10 reads/minute** for a Full/Dev seat, plus a
`download_figma_images` tool. This repo's reads + asset exports all ran through
Framelink. Config lives in a gitignored `.mcp.json`.

## Readable structured data vs the `.fig` binary

This is the crux. Feeding a model a `.fig` file (proprietary binary) or a bare
screenshot gives it **no component identity**, so it redraws everything inline —
"reinventing the wheel." Feeding it the **structured data** below lets it map
design → existing code.

What Framelink returned for the theme1 screen (`node 1:969`), trimmed:

```yaml
nodes:
  - id: 1:972
    name: Bobi Level_banner        # → reuse <Banner/>
  - id: 1:980
    name: Tab switch               # → reuse <TabSwitch/>
  - id: 1:5015
    name: 'Status Icon '           # → reuse <StatusIcon/> (4 states)
globalVars:
  fill_9MP7NQ:                     # → token --grad-cta
    - gradient: linear-gradient(180deg, #FBC059 0%, #F86A32 100%)
  style_LX9ELZ:                    # → claim amount text
    fontFamily: DIN Alternate
    fontWeight: 700
    fontSize: 24
```

- **Named components** (`Bobi Level_banner`, `Tab switch`, `Status Icon`) →
  the model knows these are reusable and maps them to `<Banner>`, `<TabSwitch>`,
  `<StatusIcon>` via `docs/components.map.md`.
- **Named tokens** (`fill_9MP7NQ`, `style_LX9ELZ`) → become Tailwind tokens
  (`--grad-cta`, font tokens) instead of hardcoded values.

A `.fig` binary carries none of this. That single difference is why the first
attempt "felt off" and this one reuses cleanly.

## Proof of reuse (theme1 screen)

`src/screens/BobiLevelTheme1/` was composed using **only** kit components — no
new styled primitives:

| Screen element | Kit component reused |
|----------------|----------------------|
| Hero banner | `<Banner>` (banner.png) |
| Yesterday/Today tabs | `<TabSwitch>` |
| Per-step status badge | `<StatusIcon>` (done / active / locked / fail) |
| Prize amount card | `<RewardCard>` |
| Claim CTA | `<Button>` (primary / disabled) |

The only screen-local code is a `StepRow` layout wrapper that *composes* those
components. Verified: zero hardcoded hex/gradient literals in the screen file.
Rendered output: `assets/figma/render-theme1.png`.

## Honest limitations

- **Proprietary display fonts** (YouSheBiaoTiHei / DIN / PingFang) aren't
  web-default; the largest text is baked into `banner.png` (faithful), smaller
  text uses a system fallback. Source the webfonts to fully close the gap.
- **Bespoke compositions** (the rewards table, the big claim panel) were
  deferred — reproducing them would mean adding a `Table` primitive to the kit
  first, which is the correct next step rather than inventing a one-off.
- Asset reuse beats CSS reconstruction for complex art (the banner's 11
  sub-layers ship as one PNG, not 11 cropped CSS layers).
