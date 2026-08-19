---
name: opus-worker-fable-advisor
description: "opus-worker-fable-advisor"
---

---
name: opus-worker-fable-advisor
description: Delegates implementation work to an Opus 4.8 sub-agent while Fable 5 (the main session) acts as advisor — writing the brief, reviewing the output, and iterating with feedback until it passes. Use when the user says "opus worker", "delegate to opus", "ให้ opus ทำ", or wants a worker/advisor split where a sub-agent implements and the main model supervises.
---

# Opus Worker, Fable Advisor

Split roles: an **Opus 4.8 sub-agent** (Agent tool, `model: "opus"`) executes the task; **Fable 5** (this session) never implements — it briefs, reviews, and advises.

## Roles

| Role | Who | Does |
|------|-----|------|
| Advisor | Fable 5 (main session) | Clarify scope, write the brief, review diffs, run verification, send feedback |
| Worker | Opus 4.8 sub-agent | Read the brief, implement, self-test, report back |

The advisor MUST NOT edit source files itself. If the worker's output needs changes, send feedback — don't fix it inline (exception: trivial one-line fixes after the final review round, stated explicitly to the user).

## Workflow

### 1. Brief (advisor)

Before spawning, write a self-contained brief containing:

- **Goal** — one paragraph, what done looks like
- **Scope** — files/modules in scope, explicit out-of-scope list
- **Constraints** — project rules that apply (from CLAUDE.md / module CLAUDE.md — quote them, the worker starts fresh)
- **Acceptance criteria** — checkable list; include the exact test/build commands to run
- **Report format** — "Return: files changed, summary per file, test results, open questions"

### 2. Spawn worker

```
Agent(
  subagent_type: "general-purpose",
  model: "opus",              // → Opus 4.8
  description: "<3-5 word task>",
  prompt: <the brief>,
)
```

- Use `isolation: "worktree"` if the working tree has unrelated in-flight changes.
- One worker per task. For 2+ independent tasks, spawn workers in parallel (one message, multiple Agent calls), each with its own brief.

### 3. Review (advisor)

When the worker returns, verify independently — do not trust the report alone:

- [ ] `git diff` — read every changed hunk
- [ ] Scope: no files touched outside the brief's scope
- [ ] Each acceptance criterion has evidence (run the tests/build yourself if the report is vague)
- [ ] Project conventions hold (hexagonal layering, naming prefixes, Decimal.js for money, logger arg order, module registration)

### 4. Iterate

If review fails, **continue the same worker** (its context is intact):

```
SendMessage(to the worker's agent ID):
  "Review feedback:
   1. <specific issue, file:line>
   2. <specific issue>
   Fix these and report back with updated test results."
```

Spawn a fresh worker only if the current one is confused beyond repair or went badly off-scope. Max ~3 feedback rounds — after that, stop and report the impasse to the user.

### 5. Report (advisor)

Final message to the user: what was built, review rounds needed, verification evidence (test output), and anything the worker flagged as uncertain. Do not commit — the user commits.

## Notes

- `model: "opus"` resolves to the latest Opus (currently Opus 4.8). Don't hardcode a dated model ID.
- The worker's final text is returned only to the advisor — relay what matters to the user.
- SendMessage may need loading first: `ToolSearch("select:SendMessage")`.