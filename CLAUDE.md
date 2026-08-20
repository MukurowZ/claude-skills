# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Personal, cross-project Claude Code skills. Each top-level directory is one skill: a `SKILL.md` (required, loaded by the Skill tool) plus optional reference/template/example files the skill points to. There is no application code, build step, or test suite — this is a documentation/prompt repo, and `package.json`'s `test` script is a placeholder only.

## Commands

```bash
./install.sh          # symlink every skill dir into ~/.claude/skills/ (idempotent, collision-safe)
node bin/install.js    # same thing (Node port; also the npm-package installer)
npm publish            # publish current working tree to npm as @mukurowz/claude-skills
```

`install.sh` walks the repo for any `SKILL.md` (recursive, arbitrary depth) and symlinks its parent dir into `~/.claude/skills/<dirname>`. It refuses to clobber a name that's a real (non-symlink) file/dir there, or a symlink pointing outside this repo (e.g. a skill managed by a different installer) — it just skips and logs those.

`bin/install.js` is the same logic in Node and is the package's `bin` + `postinstall` entry, so `npx @mukurowz/claude-skills` installs everything automatically. It symlinks when run from a checkout, but **copies** (with a `.installed-by-claude-skills` marker file per dir) when it detects it's running from `node_modules`/the npx cache, because the cache can be pruned and symlinks into it would dangle. On re-run it only replaces dirs carrying that marker or symlinks pointing into this repo — real dirs owned by anything else are skipped. Keep the two installers behaviorally in sync when editing either.

**`npm publish` packs the working tree as-is, not a git commit** — uncommitted or untracked files under a skill dir go out to the public registry. Commit and verify `git status` is clean before publishing.

## Adding or editing a skill

1. Add/edit `<skill-name>/SKILL.md` (frontmatter: `name` + `description`; description drives when Claude auto-loads it — see any existing SKILL.md for the pattern of concrete triggers/symptoms).
2. Put heavy reference material or reusable templates in sibling files under the skill dir (e.g. `amigos/TEMPLATE.md`, `amigos/references/*.md`), not inline in SKILL.md.
3. `git add`, commit.
4. `./install.sh` locally to pick it up; other devices run `git pull && ./install.sh`.

Skills that wrap `superpowers:*` skills (e.g. `amigos` builds on `superpowers:brainstorming`/`writing-plans` conventions, writing to `docs/superpowers/specs/`) assume that plugin is installed in the consuming project — this repo doesn't vendor it.

## Third-party skills — do not vendor

Matt Pocock's skill set is intentionally **not** copied into this repo (would fork and go stale). It's installed/updated per-device via its own tool:

```bash
npx skills@latest add mattpocock/skills   # install
npx skills@latest update -g -y            # update global skills to latest
```

## Publishing / distribution

The repo is mirrored to npm as [`@mukurowz/claude-skills`](https://www.npmjs.com/package/@mukurowz/claude-skills) (public). `npx @mukurowz/claude-skills` runs `bin/install.js` and installs every skill automatically (copy mode; see above). Both the git repo and the npm package are public — never add real internal project names, collection/schema names, ticket IDs, or org-specific identifiers into skill examples; keep example branch names, table names, etc. generic/fictional.
