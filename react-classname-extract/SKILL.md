---
name: react-classname-extract
description: Add a filename-derived semantic root `className` to every React component (`.tsx`/`.jsx`) so each component is grep-able by name. For example, `CommonInput.tsx` gets `className="common-input"` on its root JSX element. Use whenever the user asks to "add a class name to the component", "name the root element", "make components searchable by class", "add a component class", "BEM the root", "tag the root with a class", or any request to standardise root-level `className` naming across React component files. Also trigger when the user says the components are hard to find in DevTools or when they paste a `.tsx`/`.jsx` file whose root element has no semantic class. Do NOT trigger for `.html`, `.vue`, `.pug`, `.svelte`, or `.astro` files. Do NOT change Tailwind/utility classes, styling behaviour, or anything other than adding/merging the one filename-derived class on the root element.
---

# React component class-name tagger

Give every React component a stable, grep-able class on its root element. The class is derived from the file (or component) name in kebab-case, so the codebase has a 1:1 map between **component name** and **class hook**.

```tsx
// CommonInput.tsx — before
export function CommonInput(props: Props) {
  return <input type="text" {...props} />;
}

// CommonInput.tsx — after
export function CommonInput(props: Props) {
  return <input type="text" className="common-input" {...props} />;
}
```

## Why this exists

When every component has a predictable root class, three workflows get cheaper:

1. **Grep**: `grep -r "common-input"` finds the component definition, every place it's rendered in the DOM, every CSS rule keyed on it, and every Cypress/Playwright selector. One name, four use cases.
2. **DevTools**: in the rendered DOM tree you can read which component each node belongs to without React DevTools open.
3. **Test selectors**: `page.locator('.common-input')` is stable across refactors of internal markup.

This is intentionally **just naming** — no styling change, no Tailwind reshuffle, no CSS Modules conversion.

## What the class name should be

Derive the class from the **component identifier**, not from the styles or the role.

| Source                                 | Class                |
| -------------------------------------- | -------------------- |
| `CommonInput.tsx`                      | `common-input`       |
| `UserCard.tsx` with `export function UserCard` | `user-card` |
| `URLInput.tsx`                         | `url-input`          |
| `OrderListV2.tsx`                      | `order-list-v2`      |
| `useDebounce.ts` (hook, not a component) | skip — no JSX root |
| `index.tsx` inside `components/Avatar/` | `avatar` (use folder) |

Rules for the conversion:

- PascalCase → kebab-case. Insert `-` before every uppercase letter that follows a lowercase letter or digit.
- Runs of uppercase (`URL`, `API`, `HTTP`) collapse to one segment: `URLInput` → `url-input`, `APIKeyForm` → `api-key-form`.
- Digits stay attached to the segment they sit in: `OrderListV2` → `order-list-v2`, `H1Title` → `h1-title`.
- Strip common suffixes only if the user has set a project convention for it; by default, keep the full name (`UserCardComponent` → `user-card-component`).
- For `index.tsx` / `index.jsx`, use the parent folder name in PascalCase as the source.
- If a single file exports multiple named components, derive each one's class from **its own identifier**, not from the file.

## Where the class goes

On the **root JSX element** of the component's render output.

### Existing `className` — merge, don't replace

The semantic class goes **first** in the string so it's a predictable prefix when grepping (`grep '"common-input '`).

| Existing                                            | After                                                                  |
| --------------------------------------------------- | ---------------------------------------------------------------------- |
| (no `className`)                                    | `className="common-input"`                                             |
| `className="px-4 py-2"`                             | `className="common-input px-4 py-2"`                                   |
| `className={styles.root}`                           | `className={cn('common-input', styles.root)}` *(see cn() note below)*  |
| `className={isOpen ? 'open' : 'closed'}`            | `className={cn('common-input', isOpen ? 'open' : 'closed')}`           |
| `className={cn('px-4', isError && 'bg-red-50')}`    | `className={cn('common-input', 'px-4', isError && 'bg-red-50')}`       |
| `` className={`grid gap-${n}`} ``                   | `` className={`common-input grid gap-${n}`} ``                         |

**`cn()` import**: if you need to introduce `cn()` and the file doesn't already import it, add the import using the project's existing helper. Look at sibling files first — common variants are:

```ts
import { cn } from '@/lib/utils';     // shadcn convention
import { cn } from '~/share/utils';   // project alias
import clsx from 'clsx';              // some codebases use clsx directly
```

If you can't find a project-local helper, fall back to a template literal merge rather than introducing a new dependency:

```tsx
className={`common-input ${existing}`}
```

### Fragment root (`<>...</>`)

Fragments have no DOM node, so they cannot carry a class. Two options, in order of preference:

1. If the fragment wraps a single element that is the real visible root, hoist the class onto **that** element.
2. If there are multiple sibling roots (rare), leave the file untouched and flag it to the user — adding a wrapper `<div>` would change layout and is out of scope.

### Conditional/early returns

If the component has multiple `return` statements (e.g. loading / error / data), each return's root gets the same class. They are all "the root of this component" from the caller's perspective.

```tsx
if (loading) return <Spinner className="user-card" />;
if (error) return <ErrorState className="user-card" />;
return <article className="user-card">{...}</article>;
```

### Forwarded refs / HOC wrappers

The class goes on the JSX root inside the render body, not on the `React.forwardRef`/HOC wrapper itself.

```tsx
export const CommonInput = React.forwardRef<HTMLInputElement, Props>((props, ref) => (
  <input ref={ref} className="common-input" {...props} />
));
```

## What counts as a "component"

Apply this to a function/arrow function that:

- Returns JSX (directly or through an early return), AND
- Has a PascalCase identifier (named export, default export, or top-level `const`).

Do NOT touch:

- Hooks (`useFoo`) — no JSX root.
- Plain utility functions that happen to return JSX strings/fragments without a real DOM root.
- Generated files, `*.stories.tsx`, `*.test.tsx`, `*.spec.tsx` — these aren't shipped components.
- Files inside `node_modules`, `dist/`, `.next/`, build output.

## Idempotency

Running this skill twice on the same file must produce no diff. Before adding the class, check whether it's already present (either as a bare string in `className="..."` or as an argument to `cn()`/`clsx()`/`classnames()`). If it's there, leave the file alone.

## Workflow

1. For each target file, derive the class name from the source (named component → component identifier; `index.tsx` → parent folder; otherwise → filename).
2. Locate the JSX root(s) — function body, early returns, `forwardRef` render, etc.
3. For each root:
   - Skip if the class is already on it (idempotent).
   - If no `className`, add `className="<derived>"`.
   - If `className` is a string literal, prepend the derived class plus a space.
   - If `className` is a dynamic expression, wrap (or extend) via `cn()` using the project's existing helper, falling back to a template literal merge if no helper exists.
4. Preserve everything else: imports stay sorted by the project's Prettier/ESLint rules — let the post-edit lint hook re-sort if needed. Don't reorder props, don't change quote style outside the new attribute, don't reformat surrounding JSX.
5. Show the user the diff and call out:
   - Files skipped because the root was a fragment.
   - Files where you introduced a `cn()` import — say which helper you picked and why.
   - Files where the derived name collided across components in the same folder (rare but possible) so they can sanity-check.

## What this skill does NOT do

- Add classes to non-root elements, child elements, or styled sub-parts.
- Generate CSS rules, SCSS files, or Tailwind `@apply` blocks for the new class.
- Touch Tailwind/utility classes that are already there.
- Rename existing classes or remove duplicates.
- Modify `style={}` props, inline styles, or `data-*` attributes.
- Convert components to CSS Modules / `tailwind-variants` / `cva`.

## Examples

See [EXAMPLES.md](EXAMPLES.md) for end-to-end before/after files covering: bare input, existing Tailwind classes, `cn()` merge, `forwardRef`, multi-return component, `index.tsx` using folder name, and a fragment-root skip case.
