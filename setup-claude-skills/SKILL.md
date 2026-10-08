---
name: setup-claude-skills
description: "Set up this device for the claude-skills package: locate or create the knowledge vault, and install the design-views rule into the global ~/.claude/CLAUDE.md. Run once per device after install, and again after an upgrade that changes a rule."
disable-model-invocation: true
---

# Setup claude-skills

One-time, per-device setup for the skills in this package that need more than files on disk.
Prompt-driven, not a script: **explore → present → ask one section at a time → show the draft
→ write only on a clear yes.** Re-running is safe; every write is idempotent.

Sibling skills live next to this one: every `../<skill>/…` path below means
`<this-skill-dir>/../<skill>/…` (absolute — your cwd is elsewhere). A section whose skill is not
installed is skipped silently.

## 1. Explore (no user files written)

| Check | How | Feeds |
|---|---|---|
| Vault | `node ../knowledge-vault/vault.js locate`, run from the session's cwd → a path, or "no vault found" (it only refreshes its own cache `~/.claude/vault-path`) | A |
| Design-views rule | does `~/.claude/CLAUDE.md` exist; does it contain `<!-- design-views:rule -->`; does the text from that marker through `<!-- /design-views:rule -->` equal `../design-views/claude-md-rule.md` (markers included, trailing whitespace ignored) | B |
| Vault redirect section | a heading in `~/.claude/CLAUDE.md` whose title mentions a vault or planning artifacts; it ends at the next heading of the same or higher level. Unsure → ask where | B placement |

## 2. Present

One short table: section · state (`ok` / `missing` / `outdated`) · what you'd do. Sections that
are `ok` need no question — say so and move on. If everything is `ok`, report and stop.

## 3. Sections — one at a time, recommended answer first

**A. Knowledge vault** (needs `knowledge-vault`)

- `ok` → show the path, nothing to ask.
- `missing` → `locate` can miss a vault outside the cwd's folder tree, so first ask: **"Do you
  already have a vault? Give its path."** A path with `.vault.json` → run `locate` from inside it
  (fills the cache) → `ok`. A vault folder **without** `.vault.json` (made before the marker
  existed) → offer to add only that file, using `VAULT_TEMPLATE` from `vault.js`; touch nothing
  else. Never create a second vault.
- No vault anywhere → one line on why (planning docs need one place outside every repo); propose a
  sibling of the user's repos (e.g. `~/Documents/work/document-vault`). The path must not exist,
  or be an empty dir — `init` overwrites `README.md`. On yes: `node ../knowledge-vault/vault.js
  init <path>`. It prints a `PostToolUse` autocommit hook for `settings.json`: show it and ask
  separately before adding it (that is a settings change).

**B. Design-views rule in `~/.claude/CLAUDE.md`** (needs `design-views`)

Plugin and `npx skills` skills (brainstorming, writing-plans, wayfinder, grill-me, to-issues…)
get overwritten on update, so they learn about design views from this global rule, not by edits.

- `ok` → nothing to ask.
- `missing` → show the full block from `../design-views/claude-md-rule.md` and where it will go:
  right after the vault redirect section if found, else at the end of the file.
- `outdated` → show a diff, current vs package. It may be the user's own edit: ask **keep mine /
  take the package's / merge** (merge = you draft both changes together, show it, ask again);
  recommend "keep" when only the user changed it, "merge" when both did.
- No `~/.claude/CLAUDE.md` at all → ask before creating it.

The user may edit the block before writing; a later run will then show `outdated` — that's
expected, and "keep mine" answers it.

## 4. Write

- Only sections the user said yes to.
- B: `claude-md-rule.md` already starts and ends with its markers — insert its text as-is (no
  extra markers), with one blank line before and after it. If a marked block exists, replace from start marker to end marker in place —
  never a second copy, never touch text outside the markers.

## 5. Done

One line per section: what changed, or `ok, untouched`. Mention: re-run `/setup-claude-skills`
after upgrading the package if a rule changed; the marked block can also be edited by hand.

## Adding a section (for skill authors)

A skill in this package that needs per-device config gets a lettered section here (check →
ask → idempotent write), and its own SKILL.md says "missing → tell the user to run
`/setup-claude-skills`" instead of carrying its own setup steps.
