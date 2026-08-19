# Examples

Each example shows the input file, the file path it lives at (because the class is derived from filename or folder), and the resulting diff.

---

## Example 1 — Bare component, no existing className

**Path**: `src/components/CommonInput.tsx`
**Derived class**: `common-input`

**Before**

```tsx
type Props = React.InputHTMLAttributes<HTMLInputElement>;

export function CommonInput(props: Props) {
  return <input type="text" {...props} />;
}
```

**After**

```tsx
type Props = React.InputHTMLAttributes<HTMLInputElement>;

export function CommonInput(props: Props) {
  return <input type="text" className="common-input" {...props} />;
}
```

**Note** — class added before `{...props}` so a caller-supplied `className` still wins (later prop overrides earlier prop in JSX).

---

## Example 2 — Existing static `className`, merge

**Path**: `src/components/UserCard.tsx`
**Derived class**: `user-card`

**Before**

```tsx
export function UserCard({ user }: Props) {
  return (
    <article className="rounded-lg border bg-white p-4 shadow-sm">
      <h2>{user.name}</h2>
    </article>
  );
}
```

**After**

```tsx
export function UserCard({ user }: Props) {
  return (
    <article className="user-card rounded-lg border bg-white p-4 shadow-sm">
      <h2>{user.name}</h2>
    </article>
  );
}
```

**Note** — semantic class goes first. The Tailwind cluster is untouched, no class re-ordering.

---

## Example 3 — Dynamic `className`, introduce `cn()`

**Path**: `src/features/orders/OrderRow.tsx`
**Derived class**: `order-row`
**Project helper**: `cn` from `@/lib/utils` (detected by checking sibling files).

**Before**

```tsx
import { Status } from './types';

type Props = { status: Status };

export function OrderRow({ status }: Props) {
  return (
    <tr className={status === 'paid' ? 'bg-emerald-50' : 'bg-white'}>
      <td>...</td>
    </tr>
  );
}
```

**After**

```tsx
import { cn } from '@/lib/utils';
import { Status } from './types';

type Props = { status: Status };

export function OrderRow({ status }: Props) {
  return (
    <tr className={cn('order-row', status === 'paid' ? 'bg-emerald-50' : 'bg-white')}>
      <td>...</td>
    </tr>
  );
}
```

**Note** — `cn()` import added, sorted by ESLint's simple-import-sort (alphabetical). Original ternary preserved verbatim as the second `cn()` argument.

---

## Example 4 — `cn()` already present, prepend the static arg

**Path**: `src/components/ToolbarButton.tsx`
**Derived class**: `toolbar-button`

**Before**

```tsx
import { cn } from '@/lib/utils';

export function ToolbarButton({ disabled, children }: Props) {
  return (
    <button
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      {children}
    </button>
  );
}
```

**After**

```tsx
import { cn } from '@/lib/utils';

export function ToolbarButton({ disabled, children }: Props) {
  return (
    <button
      disabled={disabled}
      className={cn(
        'toolbar-button',
        'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      {children}
    </button>
  );
}
```

**Note** — derived class becomes the first `cn()` argument so it always wins the prefix slot regardless of the boolean guard.

---

## Example 5 — `forwardRef` wrapper

**Path**: `src/components/CommonInput.tsx`
**Derived class**: `common-input`

**Before**

```tsx
type Props = React.InputHTMLAttributes<HTMLInputElement>;

export const CommonInput = React.forwardRef<HTMLInputElement, Props>((props, ref) => (
  <input ref={ref} type="text" {...props} />
));
CommonInput.displayName = 'CommonInput';
```

**After**

```tsx
type Props = React.InputHTMLAttributes<HTMLInputElement>;

export const CommonInput = React.forwardRef<HTMLInputElement, Props>((props, ref) => (
  <input ref={ref} type="text" className="common-input" {...props} />
));
CommonInput.displayName = 'CommonInput';
```

**Note** — class goes on the inner JSX root, not on the `forwardRef` call.

---

## Example 6 — Multiple returns, same class on each root

**Path**: `src/features/users/UserCard.tsx`
**Derived class**: `user-card`

**Before**

```tsx
export function UserCard({ user, status }: Props) {
  if (status === 'loading') return <Spinner />;
  if (status === 'error') return <ErrorState message="Failed to load user" />;
  return (
    <article className="rounded-lg border p-4">
      <h2>{user.name}</h2>
    </article>
  );
}
```

**After**

```tsx
export function UserCard({ user, status }: Props) {
  if (status === 'loading') return <Spinner className="user-card" />;
  if (status === 'error') return <ErrorState className="user-card" message="Failed to load user" />;
  return (
    <article className="user-card rounded-lg border p-4">
      <h2>{user.name}</h2>
    </article>
  );
}
```

**Note** — every visible root of `UserCard` is tagged `user-card`. The DOM always shows `.user-card` regardless of which branch rendered, which keeps Cypress/Playwright selectors stable across states.

---

## Example 7 — `index.tsx` uses folder name

**Path**: `src/components/Avatar/index.tsx`
**Derived class**: `avatar` (folder name `Avatar` → `avatar`, not `index`)

**Before**

```tsx
export function Avatar({ src, alt }: Props) {
  return <img src={src} alt={alt} className="h-8 w-8 rounded-full" />;
}
```

**After**

```tsx
export function Avatar({ src, alt }: Props) {
  return <img src={src} alt={alt} className="avatar h-8 w-8 rounded-full" />;
}
```

---

## Example 8 — Multiple components in one file, each gets its own class

**Path**: `src/components/Card.tsx`

**Before**

```tsx
export function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border bg-white">{children}</div>;
}

export function CardHeader({ children }: { children: React.ReactNode }) {
  return <header className="border-b px-4 py-2">{children}</header>;
}

export function CardBody({ children }: { children: React.ReactNode }) {
  return <div className="p-4">{children}</div>;
}
```

**After**

```tsx
export function Card({ children }: { children: React.ReactNode }) {
  return <div className="card rounded-lg border bg-white">{children}</div>;
}

export function CardHeader({ children }: { children: React.ReactNode }) {
  return <header className="card-header border-b px-4 py-2">{children}</header>;
}

export function CardBody({ children }: { children: React.ReactNode }) {
  return <div className="card-body p-4">{children}</div>;
}
```

**Note** — class derived from each component's own identifier, not from the file `Card.tsx`. `Card` / `CardHeader` / `CardBody` get distinct classes so they're individually grep-able.

---

## Example 9 — URL-style PascalCase

**Path**: `src/components/URLInput.tsx`
**Derived class**: `url-input` (consecutive uppercase collapses to one segment)

**Before**

```tsx
export function URLInput(props: Props) {
  return <input type="url" {...props} />;
}
```

**After**

```tsx
export function URLInput(props: Props) {
  return <input type="url" className="url-input" {...props} />;
}
```

**Note** — not `u-r-l-input`. Runs of uppercase letters are treated as one acronym segment.

---

## Example 10 — Fragment root, skip and warn

**Path**: `src/components/UserMeta.tsx`

**Before**

```tsx
export function UserMeta({ user }: Props) {
  return (
    <>
      <span>{user.name}</span>
      <span>{user.email}</span>
    </>
  );
}
```

**After** — **no change.** Report to the user: "Skipped `src/components/UserMeta.tsx` — fragment root has no DOM node to tag. Either wrap in a `<div>` (changes layout) or accept that this component is grep-able only by its source, not by its rendered DOM."
