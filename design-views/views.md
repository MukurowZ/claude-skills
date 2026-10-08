# The four views — format, budget, example

Markers: `NEW` created · `MOD` changed · `—` existing, untouched · `[T3]` plan task · `[S2]` slice ·
`→` returns/throws. Layer tag: `[api]`, `[app]`, `[domain]`, `[infra]` (or the repo's own names).

**Short names.** Declare once under the doc title, e.g. `Names drop Acme- / -Exception / -UseCase`,
then write `DiscountChanged`, not `AcmeDiscountChangedException`. Long names are the #1 cause
of wrapped lines.

Example domain below is fictional (a shop adding place-order). Copy the shape, not the content.

## Budgets

Count **content lines**: skip blank lines, fences, sub-block labels, table header + separator rows
and the over-budget marker; `Note:` lines count. Per-type caps count fields, not the header.

| View | Detail (small work / one slice) | Outline (big effort) |
|---|---|---|
| Tree level | ≤ 30 per entry point, ≤ 60 total; extra entry points one line each | ≤ 12 per entry point |
| Tree stack | 1 line per NEW/MOD file + folder lines (scales with files — not in Whole) | ≤ 20, module names not paths |
| System design | ≤ 75, ≤ 2 mermaid | ≤ 40, 1 mermaid |
| Object | ≤ 80, ≤ 10 fields per type | ≤ 25, ≤ 5 fields per type |
| **Whole** (excl. Tree stack) | **≤ 215** | **≤ 100** |

Over a cap, cut in this order:
1. Tree level: collapse untouched callees to `(—)`; extra entry points to one line.
2. System design: drop a component flowchart that repeats a tree (keep a concurrency sequence) → fold Stores into the Queries `Where`
   column when every access is a listed query → Async to one line when nothing changes.
3. Object: commands/results/views that mirror another type → one `=` line.
4. Drop examples and sample values.

**Never cram** different facts into one line or cell to fit. Still over → the slice is too big:
add `Over budget — consider splitting` under the view that is over (for Whole: after the last view;
it is not that view's `Note:`) and stop cutting.

Lines ≤ 110 chars outside tables. Table cells ≤ ~60 chars; a longer list gets its own table.

---

## 1. Tree level

Call tree of the *desired* behaviour, one per entry point (endpoint, job, subscription, page).
Root line: the entry point only — auth, request and response types live in Contracts.
Node: `Name [layer · NEW|MOD|— · Tn]`, then one-liners for what it **reads**, **gates**,
**throws** (short exception name), **returns**. Number steps when order matters. Untouched
callees: one line ending `(—)`. Later-slice hooks: bare marker `seam S3` — the detail lives in the
Seams table. Boot jobs, migrations and crons are entry points too.

### Detail

```text
POST /v2/orders/place
└── PlaceOrderController          [api · NEW · T6]
    └── PlaceOrder                [app · NEW · T5]
        ├── 1. orders.findByKey (Q1) ─hit─► replay(order)
        ├── 2. gate: store open → StoreClosed
        ├── 3. Pricing.price      [app · NEW · T3]  reads cart, promo rules (—)
        │     fingerprint ≠ body → PriceChanged
        │     seam S3
        ├── 4. txn: orders.insert (Q2) [infra · MOD · T4]  dup key → replay winner
        └── 5. PaymentGateway.createIntent (—) → QR | CAPTURED
replay(order): owner ≠ caller → KeyReused · else → stored result
```

### Outline

```text
POST /v2/orders/place                                       [S1 S2]
└── orders.place     [orders · NEW]  gates: store open, price unchanged
    ├── pricing      [pricing · NEW]
    ├── order store  [orders · MOD]  idempotency key
    └── payments     [payments · —]  intent
```

## 2. Tree stack

One line per NEW/MOD file, **full file name** (searchable — no `{a,b}`, no `…`):
`name ..... NEW|MOD  Tn  ≤ 6-word note`. Spec beside its file: `(+ .spec)`. Untouched siblings:
one line `— <n> files untouched`. Drop untouched folders, except one a reader would expect to change
(`— calculate-order/  v1, kept`). A deep
path may go on the file line (`usecases/create-order/create-order.usecase.ts`). One count line at the end.

### Detail

```text
src/orders/
├── api/place-order.controller.ts (+ .spec) ....... NEW  T6
├── api/dto/place-order.request.ts ................ NEW  T6
├── app/place-order.usecase.ts (+ .spec) .......... NEW  T5  replay + gates
├── app/pricing.service.ts (+ .spec) .............. NEW  T3
├── infra/order.schema.ts ......................... MOD  T4  idempotency_key + index
├── infra/order.repository.ts ..................... MOD  T4  dup key → KeyConflict
└── — 14 files untouched
Count: 7 new, 2 modified (incl. specs). No new collection, topic or env var.
```

### Outline — module names, not paths

```text
orders        MOD  S1 S2   place flow, idempotency
pricing       NEW  S1      price + fingerprint
payments      —            reused
web checkout  MOD  S3      calls v2
Count: 1 new module, 2 modified, 3 proposed slices.
```

## 3. System design

Sub-blocks in this order; an empty one is a single line (`Async: none.`).

**Contracts** — one row per endpoint/event. Fields live in Object, errors in Errors. Guards and
audit/rate-limit decorators go in Auth.

| Entry | Auth | Request | 200 |
|---|---|---|---|
| `POST /v2/orders/place` | CustomerAuth | `PlaceOrderRequest` | `PlaceOrderResponse` |

**Errors** — the one home for exception → status → body.

| Exception | HTTP | Body | Entry |
|---|---|---|---|
| `PriceChanged` | 409 | `{ code: 'PRICE_CHANGED', pricing }` | place |
| `KeyReused` | 409 | `{ code: 'KEY_REUSED' }` | place |
| `StoreClosed` | 422 | `{ code: 'STORE_CLOSED' }` | place |

**Schemas** — changed fields and indexes only, before → after.

| Store.field / index | Before | After | Read by |
|---|---|---|---|
| `orders.idempotency_key` | — | string, v2 orders only | Q1 |
| index `ux_idem` | — | unique, partial `{ idempotency_key: { $type: 'string' } }` | Q1 |

**Async** — queues, topics, schedulers, webhooks, PSP calls.

| Channel | Kind | Change | Note |
|---|---|---|---|
| scheduler | `PAYMENT_WINDOW` | armed by place | best-effort |

**Stores** — one row per store, one column per entry point: `r` / `w` / `—` + query ids.

**Queries** — every query on stored data.

| # | Query | Filter / op | Index | Where |
|---|---|---|---|---|
| Q1 | idempotency lookup | `findOne({ idempotency_key })` | `ux_idem` | step 1, replay |

**Seams** — only for a slice of a bigger effort: `node · now · later slice`, one row per seam.

Mermaid: a component flowchart only if Stores + Tree level don't already show it; a sequence
only when concurrency or ordering is the risk.

**Outline** keeps Contracts (with a "main errors" column instead of the Errors table),
Stores and one component mermaid; Schemas, Async and Queries become one line each.

## 4. Object

One block per NEW/MOD type, in this order: wire types (request, response, event, error with a
body) → persisted models → domain types with new logic → the rest. Header:
`Name [layer · NEW|MOD · Tn]`. Then `field  type  note`, one field per line — fields with the
**same type and meaning** may share a line (`subtotal, taxTotal, grandTotal  Decimal`); fields of
different types never do. Nested object with self-explanatory sub-fields: inline `{ a, b, c }`;
otherwise give it its own block. MOD types: only `+` / `-` / `~` fields.
Mirror types: one line `X = Y (lineItems → items, Decimal → string)`. Alias/union: `X = 'A' | 'B'`.
Copied type: `X = copy of <source>`.
Close with `Used as-is: …` (names only).

### Detail

```text
PlaceOrderRequest            [api · NEW · T6]
  idempotencyKey   uuid v4
  cartId           string
  fingerprint      string     from quote
  payment          'QR' | 'COUNTER'

OrderPricing                 [domain · NEW · T3]
  subtotal, discountTotal, grandTotal   Decimal
  fingerprint      string     sha256 of the inputs

Order                        [domain · MOD · T4]
  + idempotencyKey?  string   v2 orders only

PlaceOrderResult = PlaceOrderResponse
Used as-is: Cart, PaymentIntent, Store.
```

### Outline — key types, ≤ 5 fields, names only

```text
PlaceOrderRequest   idempotencyKey, cartId, fingerprint, payment
OrderPricing        subtotal, discountTotal, grandTotal, fingerprint
Order (MOD)         + idempotencyKey
```
