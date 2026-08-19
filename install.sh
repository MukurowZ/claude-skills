#!/usr/bin/env bash
# Symlink every skill in this repo into ~/.claude/skills/ so Claude Code loads them.
# Recursive (finds SKILL.md at any depth) and collision-safe: never clobbers a skill
# that is managed elsewhere (e.g. mattpocock skills symlinked from ~/.agents/skills).
# Idempotent — safe to re-run. Run on each device after cloning / pulling.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="$HOME/.claude/skills"
mkdir -p "$DEST"

find "$REPO" -name SKILL.md -not -path '*/.git/*' -print0 | while IFS= read -r -d '' skill; do
  dir="$(dirname "$skill")"
  name="$(basename "$dir")"
  link="$DEST/$name"

  if [ -L "$link" ]; then
    target="$(readlink "$link")"
    case "$target" in
      "$REPO"/*) ;;                                  # ours — safe to refresh
      *) echo "skip $name (managed elsewhere: $target)"; continue ;;
    esac
  elif [ -e "$link" ]; then
    echo "skip $name (real dir/file already at $link)"; continue
  fi

  ln -sfn "$dir" "$link"
  echo "linked $name -> $dir"
done
