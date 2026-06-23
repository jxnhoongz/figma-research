#!/usr/bin/env python3
"""Export the portable Figma -> React kit.

Bundles everything Layer 1 (acquisition) + Layer 2 (the agent skill) need to
reproduce this pipeline in a CLEAN repo — the plugin, the Node build/verify
tools, the scene renderer, the skill, and config/token/component-map templates —
MINUS the section-specific screens (you bring the Figma export JSONs and let the
agent generate the screens).

Usage:
    python3 scripts/export-kit.py                # -> ./figma-react-kit/
    python3 scripts/export-kit.py --out /tmp/kit # custom output dir
    python3 scripts/export-kit.py --zip          # also write figma-react-kit.zip

See docs/figma-react-kit.md for what the kit contains and how to use it.
"""
from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

# Curated list of paths (files or dirs), relative to the repo root, that make up
# the portable kit. Order is cosmetic; missing entries are warned, not fatal.
KIT_PATHS: list[str] = [
    # --- Layer 1: the exporter plugin (runs in Figma) ---
    "figma-plugin",
    # --- Layer 1: deterministic Node tools ---
    "scripts/import-figma-export.mjs",
    "scripts/build-ir.mjs",
    "scripts/build-ir.test.mjs",
    "scripts/build-section-scene.mjs",
    "scripts/emit-component.mjs",          # frozen "proof" emitter (reference)
    "scripts/emit-component.test.mjs",
    "scripts/gen-svg-components.mjs",
    "scripts/verify-screen.mjs",           # screenshot + diff gate
    "scripts/nudge-section3-header.mjs",   # example deliberate-deviation tool
    "scripts/lib/figma.mjs",
    "scripts/lib/figma.test.mjs",
    "scripts/lib/visual-diff.mjs",
    "scripts/lib/visual-diff.test.mjs",
    "scripts/__fixtures__",                # fixtures the tests need
    # --- Layer 1: the React scene renderer ---
    "src/components/SceneRenderer",
    "src/components/PositionedText",
    "src/lib/cn.ts",
    # --- token + font starters (display font for these designs) ---
    "src/index.css",
    "public/fonts",
    # --- Layer 2: the agent skill ---
    "skills/replicate-screen",
    # --- templates + docs ---
    "docs/components.map.md",
    "docs/figma-react-kit.md",
    # --- config starters (prune to taste in the clean repo) ---
    "package.json",
    "tsconfig.json",
    "tsconfig.node.json",
    "vite.config.ts",
]

# Junk never worth copying when a directory is included.
IGNORE = shutil.ignore_patterns(
    "node_modules", ".DS_Store", "dist", "*.tsbuildinfo", "*.local", "__pycache__"
)


def copy_entry(rel: str, out_root: Path) -> str:
    """Copy one repo-relative file or dir into out_root. Returns a status line."""
    src = REPO_ROOT / rel
    dest = out_root / rel
    if not src.exists():
        return f"  SKIP (missing)  {rel}"
    dest.parent.mkdir(parents=True, exist_ok=True)
    if src.is_dir():
        shutil.copytree(src, dest, ignore=IGNORE, dirs_exist_ok=True)
        n = sum(1 for _ in dest.rglob("*") if _.is_file())
        return f"  dir   {rel}  ({n} files)"
    shutil.copy2(src, dest)
    return f"  file  {rel}"


def write_kit_readme(out_root: Path) -> None:
    """A short pointer at the kit root; the full guide is docs/figma-react-kit.md."""
    (out_root / "README.md").write_text(
        "# Figma -> React kit\n\n"
        "Portable toolkit to reconstruct a Figma screen into React with an agent.\n\n"
        "**Start here:** `docs/figma-react-kit.md` (architecture, commands, and how\n"
        "to use this kit in a clean repo).\n\n"
        "Quick path:\n"
        "1. `npm install` (deps are in `package.json`).\n"
        "2. In Figma, run `figma-plugin/` on a screen; save the bundle JSON.\n"
        "3. `node scripts/import-figma-export.mjs <bundle.json> <exportDir>`\n"
        "4. `node scripts/build-section-scene.mjs <exportDir> \"<screenId>\" <assetsOut> <sceneOut.json>`\n"
        "5. Mount `<SceneRenderer>` (src/components) over the scene, then follow\n"
        "   `skills/replicate-screen/SKILL.md` to promote structure on top.\n"
        "6. Verify: `node scripts/verify-screen.mjs <url> <exportDir>/render/<screen>.png <out>`\n",
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
    lines = [copy_entry(rel, out_root) for rel in KIT_PATHS]
    write_kit_readme(out_root)

    missing = [l for l in lines if "SKIP" in l]
    manifest = "Figma -> React kit — bundled paths\n\n" + "\n".join(lines) + "\n"
    (out_root / "KIT-MANIFEST.txt").write_text(manifest, encoding="utf-8")
    print(manifest)

    total = sum(1 for _ in out_root.rglob("*") if _.is_file())
    print(f"Done: {total} files in {out_root}")
    if missing:
        print(f"WARNING: {len(missing)} listed path(s) were missing (see above).", file=sys.stderr)

    if args.zip:
        zip_base = str(out_root)
        archive = shutil.make_archive(zip_base, "zip", root_dir=out_root)
        print(f"Zipped -> {archive}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
