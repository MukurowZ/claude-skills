---
name: create-pull-request
description: Create a GitHub PR (gh cli) whose base is the branch's own ancestor — the branch it was actually cut from — never a guessed default. Supports draft or ready-to-merge state; ready is the default unless the user says draft. Use when the user asks to create/open a PR, make a pull request, "PR this", or after finishing work on a branch created with the create-branch skill.
---

# Create Pull Request (ancestor base + draft/ready)

Two invariants:

1. **PR base = the branch's ancestor** — the branch it was cut from (develop, release/staging, a parent feature branch…). Never assume `main`/`develop`; detect it.
2. **State**: ready to merge by default. Draft only when the user says draft/WIP.

## Pre-flight

```bash
BRANCH=$(git branch --show-current)
REMOTE=$(git remote | grep -m1 '^origin$' || git remote | head -1)
```

- Working tree clean, work committed.
- Branch pushed to its own name: `git rev-parse --abbrev-ref @{u}` = `$REMOTE/$BRANCH`.
  Not pushed / wrong upstream → follow the create-branch skill's push rules first
  (`git push -u "$REMOTE" "$BRANCH"`).

## Detect ancestor (base branch)

**1. Branch reflog — primary.** Creation event records the source:

```bash
git reflog show "$BRANCH" | tail -1
# "branch: Created from origin/release/staging" → base = release/staging (strip remote prefix)
# "branch: Created from develop"            → base = develop
```

**2. Merge-base distance — fallback** when reflog says `Created from HEAD` / a bare SHA, or reflog expired:

```bash
for c in $(git branch -r --format='%(refname:short)' | grep -vE 'HEAD|/'"$BRANCH"'$'); do
  mb=$(git merge-base HEAD "$c" 2>/dev/null) || continue
  echo "$(git rev-list --count "$mb"..HEAD) $c"
done | sort -n | head -5
```

Smallest count = nearest ancestor. Compare only plausible bases (develop, main,
release/*, or a parent feature branch that shows up closest).

**3. Ambiguous** (tie between candidates, or result surprising vs conversation
context) → state the candidates and ask the user which base. Never silently pick.

## Create

```bash
gh pr create --base <ancestor> --head "$BRANCH" --title "<title>" --body "<body>"
# draft requested:
gh pr create --draft --base <ancestor> ...
```

- `--base` is **always explicit** — omitting it makes gh use the repo default branch, which breaks the ancestor rule.
- Title: conventional-commit style matching the branch type, e.g. branch
  `fix/modal-close-flicker` → `fix(checkout): modal flickered on close`.
- Body: summary + change list + test plan. Use `.github/PULL_REQUEST_TEMPLATE.md` when the repo has one.
- Print the PR URL when done.

## State changes after creation

```bash
gh pr ready <number>            # draft → ready to merge
gh pr ready <number> --undo     # ready → draft
```

## Checklist

1. Branch pushed, upstream same-name ✓
2. Ancestor detected via reflog (or merge-base fallback), confirmed if ambiguous ✓
3. `gh pr create` with explicit `--base` ✓
4. Draft flag only when user asked for draft ✓
