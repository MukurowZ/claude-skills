---
name: design-views
description: Use when writing or updating any planning artifact that describes a code change — spec, design doc, implementation plan, wayfinder map or ticket, issue, PRD, grilling record — or when a plan/spec is getting long, repetitive, prose-heavy, or restates the same contract, fields or file list in several places. Also use when asked for a "tree view", "call tree", "file tree", "system design", "object/type view" of planned work, or to set up the design-views rule on a new device.
---

# Design Views

Every planning artifact carries the same **four views**, sized to the work. Views replace
prose: a reviewer reads trees and tables, not paragraphs. One fact lives in one view.

| # | View | Answers | Form |
|---|---|---|---|
| 1 | **Tree level** | what runs, in what order, what it gates/throws/returns | call tree per entry point |
| 2 | **Tree stack** | which files are created/changed, by which task | file tree + count line |
| 3 | **System design** | contracts, errors, schemas, async, stores, queries | tables + ≤ 2 mermaid |
| 4 | **Object** | which types exist and their fields | one compact block per type |

**Read `views.md` in this directory before writing views** — formats, budgets, cut order, examples.

## Pick the depth: outline or detail (no vibes)

**Big** if ANY is true, else **small**:

- ≥ 2 slices / PRs, or it is a wayfinder map, PRD, or multi-ticket effort
- touches ≥ 3 modules (top-level package, bounded context, or service)
- > 20 files changed (tests included)
- adds or changes a shape another module/service reads: collection/table, index, topic/queue, public API

| Work | Write |
|---|---|
| small | **detail** only, one pass |
| big | **outline** first (slices marked *proposed*) → **stop for approval** → **detail** per slice |
| one slice of an approved big effort | **detail** only; > 40 files (tests incl.) → say "consider splitting" in chat and a Tree stack `Note:` |

Outline = modules/components, main contracts, key types. No file paths, no full field lists.
Detail = classes/functions, files with task ids, full contracts + errors, all NEW/MOD fields.

## Where views live

| Artifact | Depth | Location |
|---|---|---|
| big effort (spec / map / PRD) | outline | `<effort>/design.md`; spec and map link it in one line (maps stay indexes) |
| plan (slice or small work) | detail | `## Design views` at the top of the plan |
| spec for small work | detail | `## Design views` in `spec.md`; the plan links it, never copies |
| ticket / issue | scoped | `## Design views` ≤ 20 lines: what this ticket makes NEW/MOD + links |
| research / grilling ticket | current system | views of what exists now, or `n/a — <reason>` |

A view that doesn't apply is one line (`Async: none.`). Never pad.

## Rules that keep it short

1. **One fact, one home.** Paths → Tree stack. Fields → Object. Exception → HTTP → body → Errors
   table. Auth + request/response types → Contracts. Indexes → Schemas. Others name it, never restate it.
2. **No prose in views.** Max one `Note:` line per view. Rationale lives in decision lines, not views.
   Short names: drop the repo-wide prefix/suffix once in a legend — unless that makes two names clash.
3. **Collapse the unchanged**, never cram the changed. Budgets are caps; cut in `views.md` order.
4. **Iterate in place.** Review and grilling edit the existing views. No `v2` files, no changelog
   sections — the vault's git is the history.
5. **Code wins.** After build, fix views that disagree with code or mark the doc stale.
   Precedence: plan views > design/spec views > ticket views.
6. **Plans point, don't repeat.** A task opens with `Views: T3 rows in Tree stack, Object Order`,
   then steps. No re-listing files, fields, errors or contracts. Code blocks only for tests and
   logic the views don't pin down.

## Workflow wiring

| Skill | Does |
|---|---|
| `superpowers:brainstorming` | depth rule; big → outline views in `design.md` + approval gate before slicing |
| `mattpocock-skills:wayfinder` | outline views in `design.md`; each ticket gets scoped `## Design views` |
| `wayfinder-next` | chip prompt tells the session to read/update views |
| `grill-me`, `grill-with-docs`, `mattpocock-skills:grilling` | each resolved decision that moves a node/row → edit views in place |
| `to-issues` | big effort needs approved outline views first; each issue gets scoped views |
| `superpowers:writing-plans` | detail views at top; Tree stack replaces "File Structure"; rule 6 |

**Approval gate:** after outline views, stop and ask. No issues, build tickets or plans until a
clear yes. Detail views are reviewed with the plan, before code.

## Setup (once per device)

The rule that hooks plugin / `npx skills` skills lives in `~/.claude/CLAUDE.md` (block in
`claude-md-rule.md` here). On load, if `~/.claude/CLAUDE.md` has no `<!-- design-views:rule -->`
marker, tell the user once per session: **run `/setup-claude-skills`**. Never write that file
from this skill.

## Common mistakes

| Mistake | Fix |
|---|---|
| Body fields in the tree AND the contract | Tree root = entry point only; fields in Object |
| Error codes in tree, contract row and Object | Tree: short exception name; Errors table maps it |
| Fields of different types on one line to hit the cap | Share a line only for same type + meaning; else flag over budget |
| `{a,b}.ts`, `…v3.usecase.ts` in Tree stack | Full file names — people grep these |
| Outline views with file paths | Module names only |
| New `design-v2.md` after review | Edit in place |
