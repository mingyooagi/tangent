---
name: tangent
description: Visual tuner for AI-generated UI code. Use when building or adjusting React UI — styling, spacing, colors, gradients, shadows, easing. Provides useTangent() hook for tunable values that persist to source via AST. Includes Discovery Mode (inspect any element), MCP server (AI agent integration), and structured tuning events. Activate when user asks to tune, adjust, tweak UI values, set up Tangent, use Discovery Mode, or connect AI agents to the tuning panel.
---

# Tangent

Visual tuner for AI-generated code. Values adjusted in the browser are saved directly to source files via AST modification.

## Setup

### Vite

```ts
// vite.config.ts
import tangent from "vite-plugin-tangent";
export default defineConfig({ plugins: [react(), tangent()] });
```

```tsx
// App.tsx — wrap app with provider
import { TangentProvider } from "tangent-core";
<TangentProvider>{children}</TangentProvider>
```

### Next.js

```js
// next.config.js
const { withTangent } = require("next-plugin-tangent");
module.exports = withTangent({ /* next config */ });
```

```tsx
// layout.tsx — use client-side provider
<TangentProvider endpoint="/api/tangent/update">{children}</TangentProvider>
```

```ts
// app/api/tangent/update/route.ts
import { POST, GET } from "next-plugin-tangent/api";
export { POST, GET };
```

## Core Pattern: useTangent

Register tunable values in any component. Tangent auto-detects types and renders appropriate controls (slider, color picker, gradient editor, etc).

```tsx
import { useTangent, TangentRoot } from "tangent-core";

function HeroSection() {
  const styles = useTangent("HeroSection", {
    padding: 60,              // → slider
    headerColor: "#00ff9f",   // → color picker
    fontSize: 48,             // → slider
    opacity: 1,               // → slider
    bgGradient: "linear-gradient(135deg, #00ff9f, #00d4ff)", // → gradient editor
    shadow: "0px 4px 20px 0px rgba(0,255,159,0.4)",         // → shadow editor
    easing: "cubic-bezier(0.4, 0, 0.2, 1)",                 // → curve editor
    visible: true,            // → toggle
  });

  return (
    <TangentRoot tangent={styles} style={{ padding: styles.padding }}>
      <h1 style={{ color: styles.headerColor, fontSize: styles.fontSize }}>
        Title
      </h1>
    </TangentRoot>
  );
}
```

**Rules:**
- `id` (first arg) must be unique per component instance
- Value types: `number`, `string` (color/gradient/shadow/easing/text), `boolean`
- Type detection uses key names and value patterns — name keys clearly (e.g. `headerColor`, `boxShadow`, `easing`)
- Wrap the root element with `<TangentRoot tangent={styles}>` to enable highlight linking
- In production, `useTangent` returns defaults with zero overhead

## When to Add useTangent

Add `useTangent()` when:
1. **Creating new UI components** — wrap visual properties (spacing, colors, typography)
2. **User says "tune" / "adjust" / "tweak"** — make the mentioned values tunable
3. **AI generated hardcoded values** — make them editable without re-prompting
4. **Responsive design work** — wrap breakpoint-sensitive values

Do NOT add `useTangent()` for logic values, API URLs, or non-visual config.

## Discovery Mode

Press `⌘⇧D` or click `◎` to enter Discovery Mode. Click any element to see:
- CSS selector path
- React component hierarchy
- Computed styles
- Suggested tunable properties with types

Use this to identify which properties to wrap with `useTangent()` before writing code.

## MCP Server (AI Agent Integration)

Install and configure `tangent-mcp` to let AI agents interact with tuning values:

```bash
npm install tangent-mcp
```

**Claude Code:** `claude mcp add tangent -- npx tangent-mcp`

**Cursor** (`.cursor/mcp.json`):
```json
{ "mcpServers": { "tangent": { "command": "npx", "args": ["tangent-mcp"] } } }
```

### Available MCP Tools

| Tool | Use When |
|------|----------|
| `tangent_list_registrations` | Need to see all tunable components |
| `tangent_get_values` | Need current values for a specific component |
| `tangent_update_value` | Want to live-preview a value change |
| `tangent_save_all` | Ready to persist changes to source files |
| `tangent_watch_changes` | Want to monitor user's tuning activity |
| `tangent_suggest_value` | Have a design/accessibility recommendation |
| `tangent_health` | Check if Tangent dev server is running |

## Tuning Events

Subscribe to tuning events programmatically:

```ts
import { onTuningEvent } from "tangent-core";

onTuningEvent((event) => {
  // event.type: "value.changed" | "value.saved" | "value.reset"
  //            | "registration.added" | "registration.removed"
  //            | "discovery.inspected"
  // event.payload: { id, filePath, key, oldValue, newValue, ... }
});
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘⇧T` | Toggle control panel |
| `⌘S` | Save all to source |
| `⌘Z` / `⌘⇧Z` | Undo / Redo |
| `⌘⇧S` | Toggle spacing overlay |
| `⌘⇧D` | Toggle discovery mode |
