# Plugin Chrome Export — Design

**Date:** 2026-06-22
**Status:** Approved (design) — pending spec review
**Phase:** Structured-output upgrade, sub-project 2 (prerequisite for the editable-component emitter)

## Context & motivation

The structured-output upgrade aims to emit componentized, data-driven React from
a Figma export (so designs become editable/integratable, not frozen pixels).
Sub-project 1 (the semantic IR, already merged) tags nodes by role and extracts
each component instance's text into structured data.

But there's a wall: a repeated card (e.g. a reward card) is **one instance baked
into a single image** — icon + amount + requirement are all in the PNG. So the
data *structure* extracts cleanly, but editing `amount` in data **can't change a
baked pixel**. To make a card genuinely data-driven, the component must render a
**text-less background** with live text overlaid on top.

This sub-project adds exactly that capability to the existing exporter plugin
([figma-plugin/code.js](../../../figma-plugin/code.js)): for instances that
contain text, also export a **text-less "chrome" image**. The downstream emitter
(next sub-project) renders `chrome image + data-driven text`.

This is an **addition to the one existing plugin**, not a new plugin.

## Goal

For each qualifying instance, the plugin renders the instance with its TEXT
descendants hidden and records the resulting "chrome" asset in a new
`chrome.json` map (`instanceId → chrome asset path`). Purely additive: the
existing `manifest.json`, assets, and `export-stats.json` are unchanged, so the
v1 scene pipeline and all committed scenes keep working untouched.

## Non-goals (deferred)

- No component synthesis / code emission / data files — that's the next
  sub-project (the emitter consumes `chrome.json`).
- No change to `manifest.json`'s schema, to `build-section-scene.mjs`, the IR
  builder, or the app.
- No "which instances are componentizable" decision in the plugin — it provides
  the capability; the downstream emitter decides where to use it.

## Qualifying rule

A node qualifies for chrome export iff it is an `INSTANCE` **and** has at least
one **visible** `TEXT` descendant (anywhere in its subtree, including nested
instances).

Rationale: the plugin should not decide what's "componentizable" (a recurrence
judgement that belongs downstream). It simply offers a text-less variant for any
text-bearing instance. Content-hash dedup (below) keeps the cost low — cards
that share an icon/background produce identical chrome and collapse to one file.

## Mechanics

For each qualifying instance, during the existing `walk` (in the `INSTANCE`
branch, after the normal full `emitWhole`):

1. Collect its visible TEXT descendants.
2. Set each one's `visible = false`.
3. `renderWhole(instance)` — same render path as a normal whole export (PNG if it
   contains a raster, else SVG; with the existing format fallback).
4. Content-hash dedup the rendered bytes (separate `chromeSeen` map); write new
   ones to `chrome/<safeName>.<ext>`.
5. Record `chromeManifest[instance.id] = path`.
6. **Restore visibility in a `finally`** — every hidden TEXT goes back to
   `visible = true`. The document must never be left mutated, even if
   `renderWhole` throws (on throw, skip per the failure rule below).

Chrome is best-effort and additive: if `renderWhole` throws, restore visibility
(in `finally`) and simply skip — the instance is left **absent from
`chrome.json`**, which the downstream emitter reads as "no chrome available, fall
back to the baked image." Do **not** route chrome failures through
`recordFailure`/`failed.json` — that file is for missing *visuals*, and the
instance's full bake succeeded, so adding it there would be misleading.

## Output format (additive)

- New directory `chrome/` in the bundle holds the text-less images.
- New file **`chrome.json`**: `{ "<instanceId>": "chrome/<name>.<ext>", … }`.
- `export-stats.json` gains a `chrome` count (and `chromeDeduped`). All existing
  fields/files are unchanged.

The separate `chrome.json` (rather than extending `manifest.json` entries from
`string` to `object`) is deliberate: it keeps `build-section-scene.mjs` and
every committed scene working with zero changes.

## Dedup

Chrome images dedup by rendered-content hash, in their own `chromeSeen` map
(chrome bytes differ from the full-bake bytes, so they never collide with normal
assets; a separate map keeps the `chrome/` path namespace clean). Identical
chrome (same icon + background, different baked amounts) collapses to one file.

## Risks / caveats

- **Auto-layout reflow.** Hiding a TEXT node inside an *auto-layout* instance can
  reflow the remaining content, shifting the chrome. Reward cards (and most promo
  cards) are absolutely-positioned, so they're safe. Documented caveat: for
  auto-layout instances the chrome geometry may not match the full bake; the
  emitter slice will need to account for this if it hits such a case.
- **Instance child overrides.** Setting `visible` on instance descendants is a
  valid Figma override and is reverted in `finally`; if a TEXT was already hidden
  it is not collected (so not wrongly re-shown).

## Validation

The plugin runs in the Figma sandbox; `exportAsync` and node visibility cannot be
exercised headlessly, so — consistent with how every prior plugin change was
verified — this slice's gate is **manual**:

1. `node --check figma-plugin/code.js` (syntax) and code review of the diff.
2. Re-export Section 3 with the updated plugin.
3. Confirm `chrome.json` maps the 9 reward-card instance ids to `chrome/…` paths.
4. Eyeball one chrome image: the card background/icon is present and the **text
   is gone**.
5. Confirm `manifest.json` and a regenerated scene are byte-identical to before
   (the change is additive — the full bakes are unchanged).

Note (honest limitation): the plugin is a single hand-written `code.js` loaded
directly by Figma (no bundler), so its logic isn't importable into Vitest. There
is no automated test for this slice; the next time the plugin is bundled, the
`qualifiesForChrome` / text-descendant logic should get unit tests. This is a
known gap, not an oversight.

## Out of scope (next sub-project)

The emitter that consumes `chrome.json` + the IR to generate `<RewardCard>` +
`rewards.ts` + a side-by-side render in the app. That is its own spec → plan →
build cycle, and depends on a re-export produced by this slice.
