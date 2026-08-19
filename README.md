# claude-skills

Personal, cross-project [Claude Code](https://claude.com/claude-code) skills. Lives in
its own repo so it syncs across every device.

## Skills

- **create-branch** — branch named `<type>/<slug>` (conventional-commit types); pushes to its own same-name remote branch, never the base.
- **create-pull-request** — PR whose base is the branch's real ancestor (reflog / merge-base detected); draft or ready (default ready).
- **html-to-pug-vue** — convert HTML → Pug with Vue directive support.
- **opus-worker-fable-advisor** — advisor skill.

## Third-party skills (not vendored here — installed per-device, always latest)

Matt Pocock's set is managed by its own installer, so it stays current on its own.
Don't copy it into this repo (it would fork + go stale). On each device:

```bash
npx skills@latest add mattpocock/skills   # install
npx skills@latest update -g -y            # update global skills to latest
```

## Install on a new device

```bash
git clone <this-repo-url> ~/claude-skills
~/claude-skills/install.sh
```

`install.sh` symlinks each skill dir into `~/.claude/skills/` (idempotent, re-run after adding skills).

## Add a skill

Drop a new `<skill-name>/SKILL.md` in this repo, commit, `./install.sh`. Other devices: `git pull && ./install.sh`.
