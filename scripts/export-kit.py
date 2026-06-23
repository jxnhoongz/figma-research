#!/usr/bin/env python3
"""Export the portable Figma -> React kit (capability only).

Bundles the *pipeline capability* — the Figma plugin, the Node build/verify
tools, the scene renderer, and the `replicate-screen` agent skill — and NOTHING
project-specific (no screens, no app shell, no design tokens, no config). When
the kit is dropped into a repo, the agent (via the skill's "0. Adapt to the
project" step) either initializes a fresh React app or reads and follows an
existing project's structure.

Usage:
    python3 scripts/export-kit.py                 # -> ./figma-react-kit/
    python3 scripts/export-kit.py --out /tmp/kit  # custom output dir
    python3 scripts/export-kit.py --zip           # also write <out>.zip

See docs/figma-react-kit.md for the architecture and the clean-repo workflow.
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

# Kit entries: each is either "path" (copy to the same relative path) or
# ("src", "dest") to REMAP (used to lift the renderer out of `src/` so the kit
# imposes no project layout — the agent installs it where the project keeps
# components). Relative import structure inside `renderer/` is preserved so the
# files compile as-is.
KIT_ENTRIES: list = [
    # --- Layer 1: the exporter plugin (runs in Figma) ---
    "figma-plugin",
    # --- Layer 1: deterministic Node tools (general; no section-specific scripts) ---
    "scripts/import-figma-export.mjs",
    "scripts/build-ir.mjs",
    "scripts/build-ir.test.mjs",
    "scripts/build-section-scene.mjs",
    "scripts/emit-component.mjs",          # frozen "proof" emitter (reference)
    "scripts/emit-component.test.mjs",
    "scripts/verify-screen.mjs",           # screenshot + diff gate
    "scripts/lib/figma.mjs",
    "scripts/lib/figma.test.mjs",
    "scripts/lib/visual-diff.mjs",
    "scripts/lib/visual-diff.test.mjs",
    "scripts/__fixtures__",
    # --- Layer 1: the React scene renderer (installable; preserves internal imports) ---
    ("src/components/SceneRenderer", "renderer/components/SceneRenderer"),
    ("src/components/PositionedText", "renderer/components/PositionedText"),
    ("src/lib/cn.ts", "renderer/lib/cn.ts"),
    # --- Layer 2: the agent skill + the catalog template ---
    "skills/replicate-screen",
    ("docs/components.map.md", "templates/components.map.md"),
    # --- the guide ---
    "docs/figma-react-kit.md",
]

# Runtime + dev deps the kit needs; versions are read from the repo package.json
# so they never drift. The agent installs these during "0. Adapt to the project".
KIT_DEPS = ["react", "react-dom", "clsx", "tailwind-merge"]
KIT_DEV_DEPS = [
    "vite", "@vitejs/plugin-react", "@tailwindcss/vite", "tailwindcss", "typescript",
    "vitest", "jsdom", "@testing-library/react", "@testing-library/jest-dom",
    "pixelmatch", "pngjs", "playwright",
]

IGNORE = shutil.ignore_patterns(
    "node_modules", ".DS_Store", "dist", "*.tsbuildinfo", "*.local", "__pycache__"
)


def copy_entry(entry, out_root: Path) -> str:
    rel, dest_rel = (entry if isinstance(entry, tuple) else (entry, entry))
    src = REPO_ROOT / rel
    dest = out_root / dest_rel
    if not src.exists():
        return f"  SKIP (missing)  {rel}"
    dest.parent.mkdir(parents=True, exist_ok=True)
    if src.is_dir():
        shutil.copytree(src, dest, ignore=IGNORE, dirs_exist_ok=True)
        n = sum(1 for _ in dest.rglob("*") if _.is_file())
        arrow = f" -> {dest_rel}" if dest_rel != rel else ""
        return f"  dir   {rel}{arrow}  ({n} files)"
    shutil.copy2(src, dest)
    arrow = f" -> {dest_rel}" if dest_rel != rel else ""
    return f"  file  {rel}{arrow}"


def dep_versions() -> tuple[dict, dict]:
    """Resolve kit dep versions from the repo package.json (stay in sync)."""
    pkg = json.loads((REPO_ROOT / "package.json").read_text(encoding="utf-8"))
    have = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
    deps = {d: have.get(d, "latest") for d in KIT_DEPS}
    dev = {d: have.get(d, "latest") for d in KIT_DEV_DEPS}
    return deps, dev


def write_agent_entrypoints(out_root: Path) -> None:
    """Cross-agent discovery files. The pipeline is plain Node/React, so any agent
    can drive it — these point each runtime at the same skill procedure."""
    agents = (
        "# Agent instructions — figma-react-kit\n\n"
        "This repo carries the **figma-react-kit**: a pipeline to reconstruct a\n"
        "finished Figma screen into React. **Any** coding agent can drive it — the\n"
        "tools are plain Node + React, with no agent-specific dependencies.\n\n"
        "## To replicate a Figma screen\n"
        "Read and follow **`skills/replicate-screen/SKILL.md`**. It begins with\n"
        '"0. Adapt to the project" — it initializes a fresh app, or reads and\n'
        "follows your existing project's structure (components / assets / screens /\n"
        "styling), then renders a baked fidelity base and promotes structure on top.\n\n"
        "## The pipeline (plain commands — no agent-specific tooling)\n"
        "1. (in Figma) run `figma-plugin/` on a screen frame -> save the bundle JSON.\n"
        "2. `node scripts/import-figma-export.mjs <bundle.json> <exportDir>`\n"
        "3. `node scripts/build-section-scene.mjs <exportDir> \"<screenId>\" <assetsDir> <sceneOut.json>`\n"
        "   (`<assetsDir>` = the project's shared assets location, not the screen folder)\n"
        "4. Render via `renderer/components/SceneRenderer`, promote structure per the\n"
        "   skill, then verify: `node scripts/verify-screen.mjs <url> <render.png> <out>`\n\n"
        "The pipeline is deterministic; the agent supplies the synthesis judgment\n"
        "(reuse vs create vs keep-baked). Full architecture: `docs/figma-react-kit.md`.\n\n"
        "Claude Code loads `skills/replicate-screen/SKILL.md` as a skill automatically;\n"
        "Codex / OpenCode / Cursor read this `AGENTS.md`; Gemini reads `GEMINI.md`\n"
        "(below) — all point to the same procedure.\n"
    )
    (out_root / "AGENTS.md").write_text(agents, encoding="utf-8")
    redirect = (
        "# figma-react-kit\n\n"
        "See **[`AGENTS.md`](AGENTS.md)** and **`skills/replicate-screen/SKILL.md`**\n"
        "for how to replicate a Figma screen into React with this kit.\n"
    )
    (out_root / "GEMINI.md").write_text(redirect, encoding="utf-8")
    (out_root / "CLAUDE.md").write_text(redirect, encoding="utf-8")


def write_readme(out_root: Path) -> None:
    deps, dev = dep_versions()
    fmt = lambda m: " ".join(f"{k}@{v.lstrip('^~')}" for k, v in m.items())
    (out_root / "README.md").write_text(
        "# Figma -> React kit (capability)\n\n"
        "Drop this kit into a repo and have your agent follow the **replicate-screen**\n"
        "procedure to reconstruct a Figma screen into React. The kit is capability\n"
        "only — no screens, app shell, tokens, or config. The skill's **\"0. Adapt to\n"
        "the project\"** step initializes a fresh app OR reads and follows an existing\n"
        "project's structure (where components / assets / screens live, the styling\n"
        "system), and installs the renderer from `renderer/`.\n\n"
        "## Works with any coding agent\n"
        "The pipeline is plain Node + React (no agent-specific deps). Point your\n"
        "agent at the procedure: **Claude Code** loads `skills/replicate-screen/SKILL.md`\n"
        "automatically; **Codex / OpenCode / Cursor** read `AGENTS.md`; **Gemini**\n"
        "reads `GEMINI.md` — all point to the same skill. A human can run the commands\n"
        "directly too.\n\n"
        "## Contents\n"
        "- `figma-plugin/` — the Figma exporter\n"
        "- `scripts/` — import / build-ir / build-section-scene / verify-screen / lib (+ tests)\n"
        "- `renderer/` — `SceneRenderer` + `PositionedText` + `cn` (install into the project)\n"
        "- `skills/replicate-screen/` — the agent procedure (start here)\n"
        "- `templates/components.map.md` — seed for the reuse catalog\n"
        "- `docs/figma-react-kit.md` — full guide\n\n"
        "## Deps the agent installs (versions tracked from source)\n"
        f"```\nnpm i {fmt(deps)}\nnpm i -D {fmt(dev)}\n```\n\n"
        "## Quick path\n"
        "1. Invoke `skills/replicate-screen/SKILL.md` — it runs step 0 (adapt) first.\n"
        "2. In Figma, run `figma-plugin/` on a screen; save the bundle JSON.\n"
        "3. `node scripts/import-figma-export.mjs <bundle.json> <exportDir>`\n"
        "4. `node scripts/build-section-scene.mjs <exportDir> \"<screenId>\" <assetsDir> <sceneOut.json>`\n"
        "   — `<assetsDir>` is the project's shared assets location, NOT the screen folder.\n"
        "5. Render via `<SceneRenderer>`, promote structure per the skill, then verify.\n",
        encoding="utf-8",
    )


def main() -> int:
    ap = argparse.ArgumentParser(description="Export the portable Figma -> React kit.")
    ap.add_argument("--out", default=str(REPO_ROOT / "figma-react-kit"),
                    help="output directory (default: ./figma-react-kit)")
    ap.add_argument("--zip", action="store_true", help="also write <out>.zip")
    args = ap.parse_args()

    out_root = Path(args.out).resolve()
    if out_root.exists():
        shutil.rmtree(out_root)
    out_root.mkdir(parents=True)

    print(f"Exporting kit -> {out_root}")
    lines = [copy_entry(e, out_root) for e in KIT_ENTRIES]
    write_agent_entrypoints(out_root)  # AGENTS.md / GEMINI.md / CLAUDE.md (cross-agent)
    write_readme(out_root)

    manifest = "Figma -> React kit — bundled paths\n\n" + "\n".join(lines) + "\n"
    (out_root / "KIT-MANIFEST.txt").write_text(manifest, encoding="utf-8")
    print(manifest)

    missing = [l for l in lines if "SKIP" in l]
    total = sum(1 for _ in out_root.rglob("*") if _.is_file())
    print(f"Done: {total} files in {out_root}")
    if missing:
        print(f"WARNING: {len(missing)} listed path(s) were missing (see above).", file=sys.stderr)

    if args.zip:
        archive = shutil.make_archive(str(out_root), "zip", root_dir=out_root)
        print(f"Zipped -> {archive}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
