# <Topic> - Amigo Review Record

> Companion to `<spec basename>-design.md`. Created when Gate 1 fires; findings pasted when each amigo returns; Answer/Source/Effect filled as the interview resolves them. Never written at the end. A re-run on an already-hardened spec adds `## Session <date>` below and leaves prior content untouched.
> Findings are quoted verbatim. A finding rewritten in the orchestrator's voice has lost the incentive that produced it.

## How to read this

Each amigo works from the document alone - never the session history - so the same wrong premise gets attacked from four directions. `Effect` is the only column that matters to the spec: it points at the Change Log row, the parked GAP, or says the finding changed nothing and why.

Id format: `<Role> <Gate>-<Kind><n>` - gate `G1` / `G2` / `F1`..`F3`; kind `Q`uestion / `F`act (repo-answered, no user needed) at gates, `B`locker / `G`ap / `N`it at final; `n` = position in the amigo's flat list. `Area` = the coverage area (or heading) the amigo tagged.

---

## Gate 1 - after sections 1-4

### BA

**Read:** <the amigo's own `Read:` line, verbatim>

| Id | Area | Finding (verbatim) | Answer | Source | Effect |
|---|---|---|---|---|---|
| `BA G1-Q1` | 2 Problem | <question> - if unanswered: <what breaks> | <answer> | user | change #2 |
| `BA G1-F2` | 3 Scope | <fact the amigo answered from the repo> | - | `file.ts:44` | none - already true |
| `BA G1-Q3` | 1 Goal | <question> | "later" | user | GAP parked |
| `BA G1-Q4` | 2 Problem | <question> | - | unreachable | ASSUMED - <assumption> |

### Dev

**Read:** <files>

| Id | Area | Finding (verbatim) | Answer | Source | Effect |
|---|---|---|---|---|---|
| `Dev G1-Q1` | | | | |

---

## Gate 2 - after sections 5-6

### QA

**Read:** <files, including the existing specs around the affected code>

| Id | Area | Finding (verbatim) | Answer | Source | Effect |
|---|---|---|---|---|---|
| `QA G2-Q1` | | | | |

### Ops

**Read:** <files>

| Id | Area | Finding (verbatim) | Answer | Source | Effect |
|---|---|---|---|---|---|
| `Ops G2-Q1` | | | | |

---

## Final pass - iteration 1

| Id | Area | Tag | Finding (verbatim) | Disposition |
|---|---|---|---|---|
| `Dev F1-B1` | 5 Design | BLOCKER | <finding> - <what is wrong as written> | fixed, change #7, re-ran |
| `QA F1-G1` | 8 Edge | GAP | <finding> | parked in Open Questions |
| `Ops F1-N1` | 9 Rollout | NIT | <finding> | not applied |

NITs are dropped from the spec and kept here. A nit a reader can see was considered is cheap; the same nit rediscovered in code review is not.

<repeat per iteration, max 3. Survivors after 3 go to the user as a decision - record what they decided and cite the change row.>

---

## Where the amigos disagreed

The one part of this review a reader cannot reconstruct from the spec.

### <one line naming the conflict>

- **`Dev G1-Q4` held:** <position, quoted>
- **`QA G2-Q2` held:** <opposing position, quoted>
- **Resolved:** <which way, by which rule from the resolution table, or "escalated - user chose X">
- **Landed as:** change #N

<repeat, or write `No amigo-vs-amigo conflicts arose.` - only if true. Four incentives with zero friction usually means the amigos were fired too early or given session history.>

---

## What nobody attacked

Coverage areas that drew no finding at all - computed from the `Area` column, not from memory - and whether that is confidence or a blind spot. A section every amigo skipped is not necessarily sound - it may just be uninteresting from all four incentives, which is exactly where defects hide.

- <section> - <why no findings>
