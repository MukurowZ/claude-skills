# claude-skills

Personal, cross-project [Claude Code](https://claude.com/claude-code) skills. Lives in
its own repo so it syncs across every device.

## Skills

- **amigos** — four-perspective (BA/Dev/QA/Ops) adversarial spec review that hardens a draft into a 9-section design doc.
- **codebase-memory** — quick reference for the codebase-memory-mcp knowledge-graph tools (search_graph, trace_path, Cypher via query_graph); structural code queries in ~500 tokens instead of grep sweeps.
- **create-branch** — branch named `<type>/<slug>` (conventional-commit types); pushes to its own same-name remote branch, never the base.
- **create-pull-request** — PR whose base is the branch's real ancestor (reflog / merge-base detected); draft or ready (default ready).
- **html-to-pug-vue** — convert HTML → Pug with Vue directive support.
- **opus-worker-fable-advisor** — advisor skill.
- **react-classname-extract** — add a filename-derived semantic root `className` to every React component.
- **wayfinder-next** — spawn one background task chip per wayfinder ticket (`#RR-LNN-<short title>`), with run-counter allocation, blocker/claim validation, and self-contained kickoff prompts.

## Third-party skills (not vendored here — installed per-device, always latest)

Matt Pocock's set is managed by its own installer, so it stays current on its own.
Don't copy it into this repo (it would fork + go stale). On each device:

```bash
npx skills@latest add mattpocock/skills   # install
npx skills@latest update -g -y            # update global skills to latest
```

## Install on a new device

One command, no clone needed (published as [`@mukurowz/claude-skills`](https://www.npmjs.com/package/@mukurowz/claude-skills)):

```bash
npx @mukurowz/claude-skills@latest   # copies every skill into ~/.claude/skills/
```

Re-run the same command to upgrade. Skills installed this way are **copies** (the npx
cache is ephemeral, so symlinks would dangle); a marker file inside each copied dir lets
re-runs refresh them safely without touching skills managed by anything else.

Or, for a device that hacks on the skills themselves — clone and symlink:

```bash
git clone <this-repo-url> ~/claude-skills
~/claude-skills/install.sh            # or: node ~/claude-skills/bin/install.js
```

`install.sh` / `bin/install.js` symlink each skill dir into `~/.claude/skills/`
(idempotent, collision-safe, re-run after adding skills). A checkout's symlinks always
win — the npx installer skips any skill already managed elsewhere.

## Add a skill

Drop a new `<skill-name>/SKILL.md` in this repo, commit, `./install.sh`. Other devices: `git pull && ./install.sh`.
