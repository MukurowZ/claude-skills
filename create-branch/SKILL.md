---
name: create-branch
description: Create a git branch named after the work using conventional-commit types (feat/, fix/, chore/, refactor/, docs/, test/, perf/, ci/, build/, revert/) and push it to the SAME-NAME remote branch. Use when starting new work, when the user asks to create/checkout a new branch, or before the first push of any new branch. Prevents the branch from tracking or pushing to the base branch (e.g. origin/develop) instead of its own remote branch.
---

# Create Branch (safe naming + safe push)

Two invariants — never break them:

1. **Branch name = `<type>/<kebab-slug>`** where `<type>` matches the conventional-commit type the work will produce.
2. **A branch pushes only to its own name on the remote.** Never to the base branch it was cut from.

## Naming

Pick the type from the work, same rules as commit messages:

| Type | Work |
|------|------|
| `feat` | new feature / capability |
| `fix` | bug fix |
| `chore` | tooling, deps, config |
| `refactor` | restructure, no behavior change |
| `docs` / `test` / `perf` / `ci` / `build` / `revert` | as named |

Slug: 2–5 kebab-case words describing the actual work, not the ticket number alone.
Good: `fix/modal-close-flicker`, `feat/checkout-store-orders-csv`. Bad: `fix/bug`, `feat/update`.

## Create

```bash
REMOTE=$(git remote | grep -m1 '^origin$' || git remote | head -1)   # never hardcode "origin" — repos may use another name (e.g. "idx")
BASE=<base-branch>            # ask context: develop, main, release/staging…
git fetch "$REMOTE" "$BASE"
git checkout -b <type>/<slug> --no-track "$REMOTE/$BASE"
```

`--no-track` is mandatory. Without it the new branch tracks `$REMOTE/$BASE`, and a
later push can target the base branch (e.g. `develop`) instead of the branch itself.

## Push — first push of a branch

```bash
git push -u "$REMOTE" <type>/<slug>
```

- **Always** name the branch explicitly and use `-u` on first push.
- **Never** run bare `git push` on a branch whose upstream is unverified.
- **Never** push `HEAD:<other-branch>` (e.g. `HEAD:develop`) unless the user explicitly asked to update that branch.

Verify after push:

```bash
git rev-parse --abbrev-ref --symbolic-full-name @{u}
# must print: $REMOTE/<type>/<slug>  — the SAME name as the local branch
```

## Pre-push checklist (any push, existing branches too)

1. `git branch --show-current` — on the intended branch?
2. `git rev-parse --abbrev-ref @{u} 2>/dev/null` — upstream is same-name, or unset?
3. Push command names remote AND branch explicitly.

## Repair a wrongly-tracked branch

Upstream points at the base branch (e.g. `origin/develop`)? Fix before pushing:

```bash
git branch --unset-upstream
git push -u "$REMOTE" "$(git branch --show-current)"
```

## Optional one-time hardening (suggest to user, don't apply silently)

```bash
git config --global push.autoSetupRemote true   # bare `git push` auto-creates same-name upstream
git config --global push.default simple         # refuse push when upstream name differs
```
