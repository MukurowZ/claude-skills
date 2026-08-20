---
name: wayfinder-next
description: Create task chips that kick off the NEXT wayfinder session(s). Reads the active wayfinder map's tickets and spawns one chip per ticket, titled `#RR-LNN-{short title}` where RR is this effort's run counter (from the map's `runs:` frontmatter), L is the ticket type letter (T/G/R/P), NN is the ticket number, and the short title is generated from the ticket. Accepts one or more ticket numbers as arguments (e.g. `02` or `01, 02, 04`); with no argument it picks the next frontier ticket. Confirms with the user before spawning a chip for a ticket that is blocked, claimed, resolved, or missing. Use when a wayfinder session or ticket is done and you want to queue the next ticket(s) as clickable chips, or when the user says "create wayfinder chip", "next wayfinder session", "chip for next ticket", "wayfinder chip".
---

# Wayfinder Next-Session Chip

Spawn background task chips so the user can start the next wayfinder session(s) in one click. Each chip's title is `#RR-LNN-{short title}`; its prompt is a self-contained `/wayfinder` kickoff for that one ticket.

**One chip = one ticket, always.** A chip may cover several tickets only in the sense that you spawn several chips — never write a prompt that tells one session to resolve more than one ticket.

## Arguments

| what the user typed | what to do |
|---|---|
| nothing | pick the **next frontier ticket** (see [Picking tickets](#picking-tickets)) — one chip |
| `02` | that ticket — one chip |
| `01, 02, 04` · `01 02 04` · `1,2,4` | those tickets — **one chip each**, in ascending order |

Accept comma- and/or space-separated numbers, with or without zero-padding. Anything that isn't a number (a slug, a phrase) → treat it as naming the ticket and resolve it against `issues/` yourself; ask if it's ambiguous.

## Chip title format

```
#RR-LNN-<short title>          e.g.  #12-G09-ถ้อยคำล็อกของ gate รายจุด
                                     #13-T17-ตัวหารเล็ก = เห็นเลข แต่ไม่ตัดสิน
```

| part | meaning |
|---|---|
| `RR` | **run number** — how many chips this effort has spawned. Zero-pad to 2 (`01`…`99`, then just grows) |
| `L` | **ticket type letter** — `T`ask · `G`rilling · `R`esearch · `P`rototype (from the ticket's `type:` frontmatter) |
| `NN` | **ticket number** from `issues/NN-<slug>.md`, zero-padded to 2 |
| short title | Thai, generated (see below) |

The prefix is exactly 8 chars, so **the short title gets ≤ 52** (`spawn_task` caps titles at 60). Fixed-width prefix is the point — the sidebar reads as columns.

### Short title

Tickets have **no H1** — generate the short title from the bold line under `## Question`. Strip the scaffolding ("ทำกฎ … ให้เป็นโค้ดจริง", "ตัดสินใจว่า…", "แก้…") and keep the kernel. Thai. Never use the file's English slug.

## Run number (`runs:` in the map)

Source of truth is the **map's own frontmatter**:

```yaml
---
repo: acme-web
effort: checkout-redesign
kind: map
runs: 12
---
```

- **Read → allocate → write back to `map.md`, once, before spawning.**
- **One chip**: `RR` = `runs + 1`; write back `runs: runs + 1`.
- **k chips**: allocate a block — the chips get `runs+1 … runs+k` **in ascending ticket order**; write back `runs: runs + k` in a **single edit**. Every chip keeps a distinct `RR`, so the sidebar still orders them.
- **No `runs:` field yet** (every map predating this convention) → the block starts at **1**. Do NOT back-fill a guess from ticket count or decisions — the counter means "runs since we started counting", not a historical total.
- **Gaps are fine.** A chip that never gets clicked, or a spawn that fails after the block was reserved, burns its number (`11 → 13`). The number exists to order runs within one effort, not to tally them.
- The `runs:` write lands in the vault, so the `autocommit.sh` PostToolUse hook commits it — nothing extra to do.

## Picking tickets

**NN always comes from an `issues/NN-<slug>.md` file** — never mint a number that already has one, and never renumber.

- **Explicit numbers given** → those are the tickets. Validate them (next section); don't silently substitute others.
- **No argument** → take the **lowest-numbered frontier ticket**: `status: open`, **not claimed**, and **every blocker `resolved`**. That is the next thing actually workable.
- **Every existing ticket is `resolved`** → the next ticket is still in the fog: **reserve** NN = highest existing NN + 1, pick **L = the type you are about to commission** (grilling / task / research / prototype — you're writing the prompt, so you know), and draw the title from the map's `## Not yet specified` or scope. The chip prompt then tells the session to create exactly that file with exactly that type. If you can't decide the type, the work isn't shaped enough for a chip — chart it first.
  **At most one fog-reserved chip per batch** — two would reserve the same NN.

## Validate before spawning — and confirm

Before spawning anything, read the frontmatter of **every** requested ticket plus the frontmatter of each of its `blockers:` targets. Flag these:

| flag | how you detect it | why it matters |
|---|---|---|
| **blocked** | any `blockers:` wikilink whose target is not `status: resolved` | the session will hit a question it can't answer yet, and may resolve it wrongly on guesses |
| **claimed** | `status: claimed` | another session already holds it — two sessions will collide on the same `## Answer` |
| **resolved** | `status: resolved` | already done; a chip re-opens settled work |
| **no file** | no `issues/NN-*.md` and NN ≠ highest + 1 | the number is a gap, not a reservation |
| **double reservation** | ≥ 2 requested numbers have no file | they'd both claim the same NN |

**If every requested ticket is clean → spawn immediately, no question asked.**

**If any is flagged** → print a compact table (ticket · flag · the specific reason, e.g. *"blocked by 05 (status: open)"*), then ask **once** with `AskUserQuestion` — never one question per ticket:

- when at least one ticket is clean: **ข้ามใบที่มีปัญหา สร้างเฉพาะใบที่พร้อม** (recommended) · **สร้างทั้งหมดอยู่ดี** · **ยกเลิก**
- when every ticket is flagged: **สร้างทั้งหมดอยู่ดี** · **เปลี่ยนไปใช้ใบ frontier แทน** (name the ticket you'd pick) · **ยกเลิก**

Respect the answer literally. "สร้างทั้งหมดอยู่ดี" is a real choice — the user may want a chip queued for a ticket whose blocker is finishing in another session right now. When you spawn a flagged ticket anyway, say so in that chip's prompt (e.g. `⚠️ ใบนี้ถูก block ด้วย 05 ที่ยังไม่ปิด — ถ้ายังไม่ปิดตอนเริ่ม ให้หยุดแล้วรายงาน อย่าเดาคำตอบของ 05`).

## Workflow

1. **Find the active map.** Wayfinder maps live in the document vault at `<VAULT>/<repo>/<effort>/map.md` (vault location per the user's global CLAUDE.md, e.g. `~/Documents/work/document-vault`). Use the map from the current conversation if known; else list `<VAULT>/*/*/map.md` and pick the one meant (ask if ambiguous).
2. **Resolve the requested tickets** per [Picking tickets](#picking-tickets). `ls` the map's `issues/`, then read the `status:`/`type:`/`blockers:` frontmatter of the candidates **and of their blockers**.
3. **Validate + confirm** per the section above. Drop or keep flagged tickets according to the answer.
4. **Read each surviving ticket** for its `## Question` bold line → short title; `type:` → `L`.
5. **Allocate the `runs:` block** in `map.md` frontmatter (add it as `runs: k` if absent) in one edit. Ascending ticket order gets ascending `RR`.
6. **Spawn one chip per ticket** with `mcp__ccd_session__spawn_task`:
   - `title`: `#RR-LNN-<short title>` (e.g. `#12-G09-ถ้อยคำล็อกของ gate รายจุด`)
   - `prompt`: the Thai kickoff template below (self-contained)
   - `tldr`: one plain line — what that session does
   - `cwd`: the target repo path (from the map's `repo:` field)
7. **Report** every chip created, one line each (`#RR-LNN-title`), plus one line for anything skipped and why.

## Chip prompt template (write in Thai)

```
/mattpocock-skills:wayfinder work through the map

Map: <absolute map.md path>

โหมด: Work through the map. ทำ ticket <NN> (<title>) — issues/<NN>-<slug>.md
ทำตามขั้นตอน wayfinder: claim ticket ก่อนเริ่ม, resolve, record (## Answer + status:resolved + เติม 1 บรรทัดใน map "Decisions so far"), ห้าม resolve เกิน 1 ticket ต่อ session
```

When the ticket is still in the fog (reserved number), say so explicitly instead of the second line's file path:

```
โหมด: Work through the map. ticket <NN> ยังไม่มีไฟล์ — แตกเป็น issues/<NN>-<slug>.md ด้วย type: <type> ก่อน แล้วค่อย claim
```

**When you spawn more than one chip for the same map**, append this line to every prompt in the batch — concurrent sessions will both edit `map.md`:

```
หมายเหตุ: มี session อื่นของ map นี้รันพร้อมกัน — ตอน record ให้ merge บรรทัดใน "Decisions so far" อย่าทับของใบอื่น
```

## Notes

- **Batching chips is fine; batching tickets into one chip is not.** Each chip's prompt still says "ห้าม resolve เกิน 1 ticket ต่อ session".
- Prefer batching tickets that **don't block each other** — chips for a chain (05 blocked by 04) queue work that can't start, which is why the confirm step exists.
- If the map has no open ticket and nothing left in the fog, say the map is complete instead of spawning a chip.
- **Don't try to put chips into a session "group".** Checked against Claude Code desktop 1.24012.9 (2026-08-03): `spawn_task` takes only `title`/`prompt`/`tldr`/`cwd`; the persisted session record has no group field; `sessionGroupingId` belongs to desktop notifications and `spaceId` to Cowork spaces (settable only via `startChildSession`, not from a chip). The title is the only channel we control — that's why it carries the run/type/ticket prefix. Re-check only if the desktop app ships a visible grouping feature.
