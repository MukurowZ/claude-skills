#!/usr/bin/env bash
# Symlink every skill in this repo into ~/.claude/skills/ so Claude Code loads them.
# Recursive (finds SKILL.md at any depth) and collision-safe: never clobbers a skill
# that is managed elsewhere (e.g. mattpocock skills symlinked from ~/.agents/skills).
# Idempotent — safe to re-run. Run on each device after cloning / pulling.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="$HOME/.claude/skills"
mkdir -p "$DEST"

# Skip what bin/install.js skips: hidden top-level dirs (.git, .claude/worktrees, …), node_modules, bin.
find "$REPO" -name SKILL.md -not -path "$REPO/.*" -not -path '*/node_modules/*' -not -path "$REPO/bin/*" -print0 | while IFS= read -r -d '' skill; do
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

# Per-device config is never written here — /setup-claude-skills asks first. Nudge if undone.
if ! grep -qs '<!-- design-views:rule -->' "$HOME/.claude/CLAUDE.md"; then
  echo
  echo "One-time setup pending: in Claude Code run /setup-claude-skills"
fi
