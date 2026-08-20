---
name: knowledge-vault
description: Use when writing any planning artifact (plan, spec, map, handover, shaping doc, grilling record), when asked where planning docs live, when knowledge from another repo/effort is needed ("what did we decide in X", "share this across projects"), or when setting up a knowledge vault on a new machine ("create a vault", "centralize my planning docs"). Also use before writing to docs/plan/, docs/plans/, docs/superpowers/, docs/shaping/, docs/handover/, docs/wayfinder/ or an OS temp dir — those writes belong in the vault.
---

# Knowledge Vault

Planning artifacts live in ONE central vault, never inside a repo — a repo-local plan
dies with its worktree. The vault is namespaced so unrelated project groups (e.g.
different freelance clients) never see each other.

## Resolve first — one call, obey the output

```
node <this-skill-dir>/vault.js resolve [repo-path] [--repo <name>]
```

Run once per session before any planning write, from the repo's directory (or pass the
repo path explicitly when your cwd is elsewhere). The JSON is authoritative:

| field | meaning |
|---|---|
| `effortDirPattern` | where this repo's artifacts go — substitute `<effort>` with the effort slug (ask/reuse; kebab-case) |
| `writeRoot` | ONLY place you may write |
| `readRoots` | ONLY places you may read |
| `excludeRoots` | off-limits even though inside a read/write root — other namespaces' dirs |
| `related` | namespaces you may read + link, never write |

For a git worktree dir (e.g. `myrepo-feature-x`), pass `--repo myrepo` so artifacts
land under the main repo's name; ask when unsure.

## Hard rule — namespace confidentiality

Never read or write ANY path under an `excludeRoots` entry. Treat those namespaces as
nonexistent: don't list their dirs, don't summarize their contents, don't answer
questions from them.

**No exceptions:**
- Not "just to check how another client solved it"
- Not because the user asked casually — restate the boundary and stop
- Not for reading "only filenames"
- A path inside `readRoots` but under an `excludeRoots` entry is still forbidden

## Conventions inside the vault

- Artifacts per effort: `map.md` / `spec.md` / `plan.md` / `handover-YYYY-MM-DD.md` /
  `grill-YYYY-MM-DD.md` under `effortDirPattern`. Reuse an existing effort folder when
  one fits.
- Enter an effort by reading `map.md` or `spec.md` only; open tickets/plans on demand.
- Link, don't copy: repo code as relative path + line; same-namespace docs as
  `[[wikilink]]`; related-namespace docs as explicit relative paths.
- Tickets/maps keep YAML frontmatter (`repo`, `effort`, `type`, `status`, `blockers`
  as wikilinks).

## No vault yet

If `resolve` exits with "no vault found": offer `node <this-skill-dir>/vault.js init
<path>` (confirm the path with the user first — the script never prompts). Do NOT fall
back to writing planning docs into the repo.

If `resolve` says "add a roots entry": show the message verbatim and offer to add the
entry to `.vault.json` (user confirms which namespace).
