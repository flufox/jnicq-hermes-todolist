#!/usr/bin/env python3
"""Fail CI when private files or legacy identifiers enter the tracked release tree."""

from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
SKIP_ROOTS = {".git", "node_modules", "dist", "server", ".codebase-memory", "__pycache__"}
FORBIDDEN_ROOTS = {"data", "backups", "secrets", ".codex-tmp", ".gstack", "legacy-integration-source"}
FORBIDDEN_NAMES = {".env", ".DS_Store", "Thumbs.db"}
TEXT_SUFFIXES = {".ts", ".tsx", ".js", ".mjs", ".py", ".md", ".yaml", ".yml", ".json", ".html", ".css", ".sh"}
LEGACY = re.compile(r"Никита|Марусик|Вместе|tasks\.jnicq\.ru|hermes[-_ ]family|FAMILY_|HERMES_HOME|D:\\Github", re.IGNORECASE)

errors: list[str] = []


def release_paths() -> list[Path]:
    """Return tracked and publishable untracked files, excluding .gitignore runtime data."""
    try:
        result = subprocess.run(
            ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
    except (OSError, subprocess.CalledProcessError):
        return list(ROOT.rglob("*"))
    return [ROOT / relative for relative in result.stdout.split("\0") if relative]


for path in release_paths():
    relative = path.relative_to(ROOT)
    if relative.parts[0] in SKIP_ROOTS:
        continue
    if relative.parts[0] in FORBIDDEN_ROOTS:
        errors.append(f"forbidden path: {relative}")
        continue
    if not path.is_file():
        continue
    if path.name in FORBIDDEN_NAMES or path.suffix in {".pyc", ".log"}:
        errors.append(f"forbidden file: {relative}")
    if path.suffix in TEXT_SUFFIXES and relative != Path("scripts/release_allowlist.py"):
        text = path.read_text(encoding="utf-8", errors="replace")
        if LEGACY.search(text):
            errors.append(f"legacy identifier: {relative}")

if errors:
    print("\n".join(sorted(set(errors))), file=sys.stderr)
    raise SystemExit(1)
print("release allowlist: clean")
