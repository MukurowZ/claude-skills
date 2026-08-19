---
name: html-to-pug-vue
description: Convert HTML to Pug template syntax with first-class support for Vue.js (v-directives, :bindings, @events, slots, modifiers). Use this skill whenever the user asks to convert, transform, or rewrite HTML into Pug — including pasted HTML snippets, `.vue` Single File Components, component fragments, or full pages. Trigger on phrases like "convert to Pug", "make this Pug", "rewrite as Pug", "Pug version of this", "html to pug", or any request that asks for `.pug` output. Also use when the user shows HTML inside a `.vue` `&lt;template&gt;` block and wants the template rewritten in Pug. Even when the user only asks casually ("can you pug this?"), trigger this skill.
---

# HTML → Pug (Vue.js)

**File-encoding note for Claude reading this skill:** all literal opening and closing angle brackets in this document (including inside code blocks) are written as the HTML entities `&lt;` and `&gt;` to satisfy the skill upload validator. When applying the rules below, treat every `&lt;` as a real opening angle bracket and every `&gt;` as a real closing one — and **emit real angle brackets in the output you give the user**, never the entities.


Convert HTML to Pug, preserving Vue.js semantics exactly. Output should be drop-in usable inside `&lt;template lang="pug"&gt;` in a Vue Single File Component.

## Core conversion rules

### 1. Tags

Drop the angle brackets. The default tag is `div` — when a tag has class or id shorthand, the `div` itself can be omitted.

| HTML | Pug |
|---|---|
| `&lt;div&gt;&lt;/div&gt;` | `div` |
| `&lt;span&gt;&lt;/span&gt;` | `span` |
| `&lt;MyComponent&gt;&lt;/MyComponent&gt;` | `MyComponent` |

Component casing is preserved exactly: `MyComponent`, `my-component`, and `BaseInput` all stay as written.

### 2. Class shorthand

A `class` attribute becomes `.classname` shorthand. When the tag is `div` and there's any shorthand, drop the `div`.

| HTML | Pug |
|---|---|
| `&lt;div class="foo"&gt;&lt;/div&gt;` | `.foo` |
| `&lt;span class="foo"&gt;&lt;/span&gt;` | `span.foo` |
| `&lt;div class="foo bar baz"&gt;&lt;/div&gt;` | `.foo.bar.baz` |

### 3. ID shorthand (highest priority)

An `id` attribute becomes `#id` shorthand and is always written **before** classes.

| HTML | Pug |
|---|---|
| `&lt;div id="bar"&gt;&lt;/div&gt;` | `#bar` |
| `&lt;div id="bar" class="foo"&gt;&lt;/div&gt;` | `#bar.foo` |
| `&lt;section id="hero" class="full bleed"&gt;&lt;/section&gt;` | `section#hero.full.bleed` |

### 4. Pug-incompatible classes (the Tailwind case)

A class is **Pug-compatible** only if it matches `^[a-zA-Z0-9_-]+$`. Any class containing `:`, `/`, `[`, `]`, `%`, `!`, `.`, `&`, `&gt;`, or other special characters cannot use `.classname` shorthand and must fall back to a `class="..."` attribute inside parens.

When a tag has a **mix** of compatible and incompatible classes, **split them**: keep compatible ones as shorthand, put incompatible ones in `class="..."`. Preserve the original left-to-right order within each bucket.

| HTML | Pug |
|---|---|
| `&lt;div class="w-[120px]"&gt;&lt;/div&gt;` | `div(class="w-[120px]")` |
| `&lt;div class="foo w-[120px]"&gt;&lt;/div&gt;` | `.foo(class="w-[120px]")` |
| `&lt;div class="foo bar w-[120px] hover:bg-red"&gt;&lt;/div&gt;` | `.foo.bar(class="w-[120px] hover:bg-red")` |
| `&lt;div id="x" class="foo w-1/2"&gt;&lt;/div&gt;` | `#x.foo(class="w-1/2")` |

Common Tailwind patterns that trigger the fallback: arbitrary values (`w-[120px]`), variants with `:` (`hover:bg-red-500`, `md:flex`, `dark:text-white`), fractions with `/` (`w-1/2`, `-translate-x-1/2`), important `!` (`!text-red`), and arbitrary properties (`[&&gt;div]:flex`).

#### Never backslash-escape in shorthand

Pug class shorthand has **no escape mechanism**. Backslash sequences like `\/`, `\:`, `\[` are **not valid Pug syntax** — they produce compile errors, not escaped characters. Do not invent escapes; always use the `class="..."` fallback for any class outside `[a-zA-Z0-9_-]`.

**Wrong (will error in Pug):**

```pug
.left-1\/2
.-translate-x-1\/2
.hover\:bg-red-500
.w-\[120px\]
```

**Right (fallback to class attribute):**

```pug
div(class="left-1/2 -translate-x-1/2 hover:bg-red-500 w-[120px]")
```

#### Worked example: long Tailwind utility chain

Input:

```html
&lt;div class="fixed bottom-4 left-1/2 -translate-x-1/2 bg-neutral-900 text-white px-4 py-2 rounded-lg shadow-xl flex gap-3 items-center z-50"&gt;&lt;/div&gt;
```

Output:

```pug
.fixed.bottom-4.bg-neutral-900.text-white.px-4.py-2.rounded-lg.shadow-xl.flex.gap-3.items-center.z-50(class="left-1/2 -translate-x-1/2")
```

The 11 compatible classes go into shorthand in their original order; the 2 classes containing `/` go into `class="..."`, also in their original relative order. There is no escaping, no rearranging beyond the bucket split.

### 5. Vue directives, bindings, and events

Anything starting with `v-`, `:`, or `@` lives inside the `(...)` attribute block. These never use shorthand. Modifiers stay attached to the directive name.

| HTML | Pug |
|---|---|
| `&lt;div v-if="show"&gt;&lt;/div&gt;` | `div(v-if="show")` |
| `&lt;div v-else&gt;&lt;/div&gt;` | `div(v-else)` |
| `&lt;li v-for="item in items" :key="item.id"&gt;&lt;/li&gt;` | `li(v-for="item in items" :key="item.id")` |
| `&lt;input v-model="name" /&gt;` | `input(v-model="name")` |
| `&lt;input v-model.lazy.trim="name" /&gt;` | `input(v-model.lazy.trim="name")` |
| `&lt;button @click="handler"&gt;&lt;/button&gt;` | `button(@click="handler")` |
| `&lt;button @click.stop.prevent="handler"&gt;&lt;/button&gt;` | `button(@click.stop.prevent="handler")` |
| `&lt;div :class="{ active: isOn }"&gt;&lt;/div&gt;` | `div(:class="{ active: isOn }")` |
| `&lt;div :style="{ color: c }"&gt;&lt;/div&gt;` | `div(:style="{ color: c }")` |

Static class shorthand and dynamic `:class` can coexist on the same tag — Vue merges them at runtime:

```pug
.btn.btn-primary(:class="{ disabled: !isValid }")
```

### 6. Combining everything

The output order on a tag is: `tag` → `#id` → `.classes` → `(attributes)`.

| HTML | Pug |
|---|---|
| `&lt;button id="submit" class="btn btn-primary" type="submit" @click="save"&gt;Save&lt;/button&gt;` | `button#submit.btn.btn-primary(type="submit" @click="save") Save` |
| `&lt;div id="bar" class="foo w-[120px]" v-model="value"&gt;&lt;/div&gt;` | `#bar.foo(class="w-[120px]" v-model="value")` |

Inside `(...)`, preserve the original left-to-right attribute order from the HTML — don't sort or rearrange.

### 7. Boolean attributes

Bare attributes (no `=value`) stay bare in parens.

| HTML | Pug |
|---|---|
| `&lt;input disabled&gt;` | `input(disabled)` |
| `&lt;input type="checkbox" checked autofocus&gt;` | `input(type="checkbox" checked autofocus)` |

### 8. Self-closing / void elements

Drop the trailing `/`. Pug knows which elements are void.

| HTML | Pug |
|---|---|
| `&lt;input /&gt;` | `input` |
| `&lt;br /&gt;` | `br` |
| `&lt;img src="logo.svg" alt="Logo" /&gt;` | `img(src="logo.svg" alt="Logo")` |
| `&lt;MyComponent /&gt;` | `MyComponent` |

### 9. Multi-line attribute formatting

When a tag has 3 or more attributes, or any attribute value is long, split them across lines for readability. The closing `)` sits on its own line at the tag's indentation.

```pug
input(
  type="text"
  v-model="form.email"
  :class="{ 'is-invalid': errors.email }"
  @blur="validateEmail"
  placeholder="you@example.com"
)
```

One or two short attributes stay on one line:

```pug
input(type="text" v-model="name")
```

### 10. Text content

**Inline** for short text (including Vue interpolations):

| HTML | Pug |
|---|---|
| `&lt;p&gt;Hello world&lt;/p&gt;` | `p Hello world` |
| `&lt;h1&gt;{{ title }}&lt;/h1&gt;` | `h1 {{ title }}` |
| `&lt;p&gt;Hello {{ name }}!&lt;/p&gt;` | `p Hello {{ name }}!` |

**Block syntax** (`tag.` on its own line, then indented content) for long, multi-line, or HTML-flavored text:

```pug
p.
  This is a longer paragraph that contains
  multiple lines and possibly {{ interpolations }}
  spanning across them.
```

### 11. Comments

HTML comments become **silent** Pug comments (`//-`), which are stripped from rendered output.

| HTML | Pug |
|---|---|
| `&lt;!-- header section --&gt;` | `//- header section` |
| `&lt;!-- TODO: refactor --&gt;` | `//- TODO: refactor` |

For multi-line HTML comments, indent each continuation line under `//-`.

### 12. Slots

Slot syntax uses parens with the `#` shorthand or `v-slot:` form. Scoped slot destructuring is just a normal attribute value.

| HTML | Pug |
|---|---|
| `&lt;template v-slot:default&gt;&lt;/template&gt;` | `template(v-slot:default)` |
| `&lt;template #header&gt;&lt;/template&gt;` | `template(#header)` |
| `&lt;template #default="{ item, index }"&gt;&lt;/template&gt;` | `template(#default="{ item, index }")` |

### 13. Nesting

Pug uses **indentation** for nesting. Use 2 spaces per level, consistently.

```html
&lt;div class="card"&gt;
  &lt;h2 class="title"&gt;{{ title }}&lt;/h2&gt;
  &lt;div class="body"&gt;
    &lt;p&gt;{{ description }}&lt;/p&gt;
  &lt;/div&gt;
&lt;/div&gt;
```

```pug
.card
  h2.title {{ title }}
  .body
    p {{ description }}
```

## Vue Single File Components

When given a `.vue` SFC:

- **Convert only the contents of the `&lt;template&gt;` block.**
- Add `lang="pug"` to the opening `&lt;template&gt;` tag.
- Leave `&lt;script&gt;`, `&lt;script setup&gt;`, `&lt;style&gt;`, and any other top-level blocks **completely untouched** (including their contents, attributes, and whitespace).
- Preserve the original order of top-level blocks.

**Example:**

Input:
```vue
&lt;template&gt;
  &lt;div class="user-card"&gt;
    &lt;h2&gt;{{ user.name }}&lt;/h2&gt;
    &lt;button @click="$emit('select', user)"&gt;Select&lt;/button&gt;
  &lt;/div&gt;
&lt;/template&gt;

&lt;script setup&gt;
defineProps(['user'])
defineEmits(['select'])
&lt;/script&gt;

&lt;style scoped&gt;
.user-card { padding: 1rem; }
&lt;/style&gt;
```

Output:
```vue
&lt;template lang="pug"&gt;
.user-card
  h2 {{ user.name }}
  button(@click="$emit('select', user)") Select
&lt;/template&gt;

&lt;script setup&gt;
defineProps(['user'])
defineEmits(['select'])
&lt;/script&gt;

&lt;style scoped&gt;
.user-card { padding: 1rem; }
&lt;/style&gt;
```

## Working examples

### Example 1: Login form

Input:
```html
&lt;form class="login-form" @submit.prevent="onSubmit"&gt;
  &lt;label class="field"&gt;
    &lt;span&gt;Email&lt;/span&gt;
    &lt;input type="email" v-model="email" required /&gt;
  &lt;/label&gt;
  &lt;label class="field"&gt;
    &lt;span&gt;Password&lt;/span&gt;
    &lt;input type="password" v-model="password" required /&gt;
  &lt;/label&gt;
  &lt;button type="submit" class="btn btn-primary" :disabled="!canSubmit"&gt;Sign in&lt;/button&gt;
&lt;/form&gt;
```

Output:
```pug
form.login-form(@submit.prevent="onSubmit")
  label.field
    span Email
    input(type="email" v-model="email" required)
  label.field
    span Password
    input(type="password" v-model="password" required)
  button.btn.btn-primary(type="submit" :disabled="!canSubmit") Sign in
```

### Example 2: Tailwind-heavy card

Input:
```html
&lt;article id="post-1" class="rounded-lg bg-white p-6 shadow-md hover:shadow-lg w-[320px]"&gt;
  &lt;h3 class="text-lg font-bold mb-2"&gt;{{ post.title }}&lt;/h3&gt;
  &lt;p class="text-gray-600 line-clamp-3"&gt;{{ post.excerpt }}&lt;/p&gt;
&lt;/article&gt;
```

Output:
```pug
article#post-1.rounded-lg.bg-white.p-6.shadow-md(class="hover:shadow-lg w-[320px]")
  h3.text-lg.font-bold.mb-2 {{ post.title }}
  p.text-gray-600.line-clamp-3 {{ post.excerpt }}
```

### Example 3: List with v-for and comment

Input:
```html
&lt;ul class="todo-list"&gt;
  &lt;li v-for="todo in todos" :key="todo.id" :class="{ done: todo.done }" @click="toggle(todo)"&gt;
    &lt;!-- checkbox + label --&gt;
    &lt;input type="checkbox" v-model="todo.done" /&gt;
    &lt;span&gt;{{ todo.text }}&lt;/span&gt;
  &lt;/li&gt;
&lt;/ul&gt;
```

Output:
```pug
ul.todo-list
  li(
    v-for="todo in todos"
    :key="todo.id"
    :class="{ done: todo.done }"
    @click="toggle(todo)"
  )
    //- checkbox + label
    input(type="checkbox" v-model="todo.done")
    span {{ todo.text }}
```

### Example 4: Slot with destructuring

Input:
```html
&lt;DataTable :rows="users"&gt;
  &lt;template #row="{ row, index }"&gt;
    &lt;td class="num"&gt;{{ index + 1 }}&lt;/td&gt;
    &lt;td&gt;{{ row.name }}&lt;/td&gt;
  &lt;/template&gt;
&lt;/DataTable&gt;
```

Output:
```pug
DataTable(:rows="users")
  template(#row="{ row, index }")
    td.num {{ index + 1 }}
    td {{ row.name }}
```

## Output format

- **HTML snippet** → return Pug inside a fenced code block (` ```pug ... ``` `).
- **`.vue` SFC** → return the full SFC inside a fenced code block (` ```vue ... ``` `), with the `&lt;template&gt;` rewritten and other blocks untouched.
- Use **2-space indentation** throughout.
- Preserve the original left-to-right order of attributes within each bucket (id before classes; classes in original order; non-shorthand attributes in original order).
- Skip explanations unless the user asks. If a fallback `class="..."` was used due to incompatible characters, briefly note which classes triggered it — the user often wants to know.

## What not to do

- **Don't backslash-escape special characters in class shorthand.** `\/`, `\:`, `\[`, `\.` are not valid Pug — the shorthand has no escape syntax. Anything outside `[a-zA-Z0-9_-]` goes into the `class="..."` attribute fallback, full stop.
- Don't reorder Vue directives or other attributes alphabetically — keep the input order.
- Don't normalize whitespace inside attribute values (e.g., don't change `:class="{ active: isOn }"` to `:class="{active:isOn}"`).
- Don't escape HTML entities (`&amp;`, `&lt;`) unless they were escaped in the input.
- Don't rewrite or simplify Vue expressions — treat them as opaque strings.
- Don't convert `&lt;script&gt;` or `&lt;style&gt;` blocks even if they contain HTML-looking content.
- Don't shorten or canonicalize class names — preserve them character-for-character.
- Don't drop empty elements — `&lt;div&gt;&lt;/div&gt;` becomes `div`, not nothing.

## Edge notes

- **Empty attribute values**: `&lt;input value="" /&gt;` → `input(value="")`. Don't drop the empty string.
- **Single quotes vs double quotes in attribute values**: prefer double quotes in the output regardless of input style, except when the value itself contains double quotes (in which case use single quotes).
- **`xmlns`, `data-*`, `aria-*` attributes**: all work fine inside parens with their original names — `(data-id="123" aria-label="Close")`.
- **Mixed content with both text and child elements**: use the block form. For `&lt;p&gt;Hello &lt;strong&gt;name&lt;/strong&gt;&lt;/p&gt;`, write it as nested children:
  ```pug
  p
    | Hello 
    strong name
  ```
  The `|` prefix marks a plain-text line at this indent level.
