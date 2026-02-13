# Tangent

Visual Tuner for AI-generated code. Adjust UI values in the browser and save changes directly to source files.

![Tangent Demo](./assets/tangent.gif)

## Features

- 🎛️ **Visual Controls** - Sliders, color pickers, gradient editors, box-shadow editors, and more
- 💾 **Save to Source** - Click Save or ⌘S to write changes back to source files via AST modification
- ⚡ **Hot Reload** - See changes instantly in the browser
- 🎨 **Cyberpunk Theme** - Dark mode UI that stays out of your way
- 📋 **Copy Prompt** - Copy changes in AI-friendly format
- 🔧 **Framework Support** - Works with Vite and Next.js
- ↩️ **Undo/Redo** - Full history support with keyboard shortcuts
- 📱 **Responsive Preview** - Test layouts at different viewport sizes
- 🔍 **Search & Filter** - Quickly find controls in large projects
- 🔦 **Element Highlighting** - Hover elements in your app to highlight them in the control panel
- 📐 **Spacing Overlay** - Visualize margins and padding
- 🤖 **MCP Server** - Let AI agents read and update tuning values via Model Context Protocol
- ◎ **Discovery Mode** - Click any element to inspect its CSS and discover tunable properties
- 📡 **Structured Tuning Schema** - Portable event format for webhooks, MCP, and third-party integrations

## Installation

### Vite

```bash
npm install tangent-core vite-plugin-tangent
```

### Next.js

```bash
npm install tangent-core next-plugin-tangent
```

## Quick Start

### 1. Setup Plugin

**Vite** (`vite.config.ts`):

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tangent from "vite-plugin-tangent";

export default defineConfig({
  plugins: [react(), tangent()],
});
```

**Next.js** (`next.config.js`):

```js
const { withTangent } = require("next-plugin-tangent");

module.exports = withTangent({
  // your next config
});
```

### 2. Add Provider

**Vite** (`App.tsx`):

```tsx
import { TangentProvider } from "tangent-core";

function App() {
  return <TangentProvider>{/* your app */}</TangentProvider>;
}
```

**Next.js** (`layout.tsx`):

```tsx
"use client";

import { TangentProvider } from "tangent-core";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <TangentProvider endpoint="/api/tangent/update">
          {children}
        </TangentProvider>
      </body>
    </html>
  );
}
```

### 3. Create API Route (Next.js only)

Create `app/api/tangent/update/route.ts`:

```ts
import { POST, GET } from "next-plugin-tangent/api";
export { POST, GET };
```

### 4. Use the Hook

```tsx
import { useTangent, TangentRoot } from "tangent-core";

function Hero() {
  const styles = useTangent("HeroSection", {
    padding: 60,
    headerColor: "#00ff9f",
    fontSize: 48,
    heroGradient: "linear-gradient(135deg, #00ff9f 0%, #00d4ff 100%)",
    titleShadow: "0px 4px 20px 0px rgba(0, 255, 159, 0.4)",
  });

  return (
    <TangentRoot
      tangent={styles}
      style={{
        padding: styles.padding,
        background: styles.heroGradient,
      }}
    >
      <h1
        style={{
          color: styles.headerColor,
          fontSize: styles.fontSize,
          textShadow: styles.titleShadow,
        }}
      >
        Welcome
      </h1>
    </TangentRoot>
  );
}
```

## Usage

Once set up, a floating control panel appears in your app:

- **Drag header** to move the panel anywhere
- **Drag right edge** to resize width
- **Click section headers** to collapse/expand
- **Use search box** to filter controls
- **Click ▼** to collapse panel to icon-only mode

## Supported Value Types

| Type                     | Control         | Example                                  |
| ------------------------ | --------------- | ---------------------------------------- |
| `number`                 | Slider + input  | `padding: 60`                            |
| `string` (hex/rgb color) | Color picker    | `color: '#00ff9f'`                       |
| `string` (gradient)      | Gradient editor | `background: 'linear-gradient(...)'`     |
| `string` (box-shadow)    | Shadow editor   | `boxShadow: '0px 4px 20px...'`           |
| `string` (easing)        | Curve editor    | `easing: 'cubic-bezier(0.4, 0, 0.2, 1)'` |
| `string` (other)         | Text input      | `text: 'Hello'`                          |
| `boolean`                | Toggle          | `visible: true`                          |

### Gradient Editor

Visual editor for CSS gradients with:

- Draggable color stops
- Click to add stops, double-click to remove
- Linear/Radial type toggle
- Angle slider for linear gradients

### Box Shadow Editor

Visual editor for CSS box-shadows with:

- X, Y, Blur, Spread sliders
- Color picker
- Inset toggle
- Live preview

## Keyboard Shortcuts

| Shortcut               | Action                 |
| ---------------------- | ---------------------- |
| `⌘⇧T` / `Ctrl+Shift+T` | Toggle control panel   |
| `⌘Z` / `Ctrl+Z`        | Undo                   |
| `⌘⇧Z` / `Ctrl+Shift+Z` | Redo                   |
| `⌘S` / `Ctrl+S`        | Save all to source     |
| `⌘⇧S` / `Ctrl+Shift+S` | Toggle spacing overlay |
| `⌘⇧D` / `Ctrl+Shift+D` | Toggle discovery mode  |
| `↑` / `↓`              | Adjust number ±1       |
| `Shift + ↑` / `↓`      | Adjust number ±10      |

## Code Preview

Click the `</>` button to open the code preview panel:

- **Diff tab** - Shows changes as a diff from original values
- **CSS Vars tab** - Exports all values as CSS custom properties

```css
:root {
  --hero-section-padding: 60px;
  --hero-section-header-color: #00ff9f;
  --hero-section-hero-gradient: linear-gradient(...);
}
```

## Responsive Preview

Test your layouts at different viewport sizes:

| Icon | Size    | Width  |
| ---- | ------- | ------ |
| 📱   | Mobile  | 375px  |
| 📟   | Tablet  | 768px  |
| 🖥   | Desktop | 1024px |
| ⬜   | Full    | 100%   |

## Discovery Mode

Click the `◎` button or press `⌘⇧D` to enter Discovery Mode. This lets you click **any element** on the page to inspect its properties — no `useTangent()` required.

When you click an element, a detail panel shows:

- **CSS Selector** — The full DOM path (e.g. `body > div#root > main > .hero > h1`), useful for `grep`
- **React Components** — The component hierarchy (e.g. `App > Hero > TangentRoot`)
- **Tunable Properties** — CSS properties that can be turned into `useTangent()` parameters, with their current computed values and types

This bridges the gap between "I want to tune this element" and "I need to write `useTangent()` code first" — you can explore what's tunable before committing to any code changes.

## MCP Server (AI Agent Integration)

Tangent includes an MCP (Model Context Protocol) server that lets AI coding agents read and update tuning values in real time.

### Setup

```bash
npm install tangent-mcp
```

**Claude Code:**

```bash
claude mcp add tangent -- npx tangent-mcp
```

**Cursor** (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "tangent": {
      "command": "npx",
      "args": ["tangent-mcp"]
    }
  }
}
```

If your Vite dev server runs on a non-default port:

```bash
npx tangent-mcp --url http://localhost:3000
```

### MCP Tools

| Tool | Description |
| ---- | ----------- |
| `tangent_list_registrations` | List all registered components and their tunable properties |
| `tangent_get_values` | Get current values for a specific component |
| `tangent_update_value` | Update a tuning value (live preview, not saved to source) |
| `tangent_save_all` | Save all unsaved changes to source files via AST |
| `tangent_watch_changes` | Block until new tuning events appear, then return batch |
| `tangent_suggest_value` | Suggest a value change with reasoning (bidirectional) |
| `tangent_health` | Check dev server connectivity and status |

### Example: AI-Assisted Tuning

Once connected, you can ask your AI agent things like:

- *"What components are available for tuning?"* — calls `tangent_list_registrations`
- *"Set the hero font size to 56px"* — calls `tangent_update_value`
- *"Save all my changes"* — calls `tangent_save_all`
- *"The card border radius should be 16px for consistency with the design system"* — calls `tangent_suggest_value` with reasoning

### Server-Side API

The Vite plugin exposes REST endpoints that the MCP server consumes:

| Endpoint | Method | Description |
| -------- | ------ | ----------- |
| `/__tangent/health` | GET | Server status with registration and event counts |
| `/__tangent/registrations` | GET | All component registrations with current values |
| `/__tangent/registrations/:id` | GET | Single component registration |
| `/__tangent/events` | GET | SSE event stream (real-time) |
| `/__tangent/suggestions` | GET/POST | Agent suggestions (bidirectional) |

## Tuning Schema

Tangent defines a structured event format for tuning operations. This enables webhooks, MCP integration, and third-party tools to consume tuning data.

### Event Types

| Event | Emitted When |
| ----- | ------------ |
| `registration.added` | A component registers with `useTangent()` |
| `registration.removed` | A component unmounts |
| `value.changed` | A tuning value is modified (slider, input, etc.) |
| `value.saved` | A value is written to the source file |
| `value.reset` | A section is reset to source values |
| `discovery.inspected` | An element is inspected in Discovery Mode |

### Subscribing to Events

```ts
import { onTuningEvent } from "tangent-core";

const unsubscribe = onTuningEvent((event) => {
  console.log(event.type, event.payload);
  // event.type: "value.changed"
  // event.payload: { id, filePath, key, oldValue, newValue, valueType }
});

// Later: unsubscribe()
```

### Schema Types

```ts
import type {
  TuningEvent,
  TuningProperty,
  TuningSession,
  ValueChangedPayload,
  DiscoveryInspectedPayload,
  AgentSuggestion,
} from "tangent-core";
```

## How It Works

1. `useTangent` registers tunable values with the control panel
2. When you adjust a value, Tangent sends a request to the dev server
3. The server uses AST modification (via [magicast](https://github.com/unjs/magicast)) to update the source file
4. Your bundler's HMR picks up the change and hot reloads

## API

### `useTangent(id, defaultValues)`

```ts
const values = useTangent("ComponentName", {
  padding: 60,
  color: "#fff",
});
```

- `id` - Unique identifier for this set of values
- `defaultValues` - Object with default values (number, string, or boolean)
- Returns the current values object extended with `tangentProps`

### `<TangentRoot>`

Wrapper component that enables element highlighting.

```tsx
<TangentRoot tangent={values} as="section" className="hero">
  {children}
</TangentRoot>
```

Props:

- `tangent` - The object returned from `useTangent`
- `as` - (Optional) Component to render (default: `'div'`)
- All other props are passed to the underlying element

### `<TangentProvider>`

```tsx
<TangentProvider endpoint="/api/tangent/update">{children}</TangentProvider>
```

Props:

- `endpoint` - API endpoint for updates (default: `/__tangent/update` for Vite)

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run Vite playground
pnpm dev

# Run Next.js playground
pnpm -C playground-next dev
```

## Project Structure

```
tangent/
├── packages/
│   ├── core/           # React hooks, UI components, schema, and event bus
│   ├── vite/           # Vite plugin with dev server middleware and state API
│   ├── next/           # Next.js plugin with API route handlers
│   ├── mcp/            # MCP server for AI agent integration
│   └── transform/      # Shared AST transformation logic
├── playground/         # Vite demo app
└── playground-next/    # Next.js demo app
```

## Contributing

We welcome contributions! Here's how to get started:

### Getting Started

1. **Fork & Clone**

   ```bash
   git clone https://github.com/YOUR_USERNAME/tangent.git
   cd tangent
   ```

2. **Install Dependencies**

   ```bash
   pnpm install
   ```

3. **Build Packages**

   ```bash
   pnpm build
   ```

4. **Start Development**

   ```bash
   # Vite playground
   pnpm dev

   # Or Next.js playground
   pnpm -C playground-next dev
   ```

### Making Changes

1. Create a feature branch

   ```bash
   git checkout -b feature/my-feature
   ```

2. Make your changes in the relevant package(s)

3. Test your changes in both playgrounds

4. Build to ensure no type errors

   ```bash
   pnpm build
   ```

5. Commit with a descriptive message
   ```bash
   git commit -m "feat: add new input type for X"
   ```

### Pull Request Guidelines

- **One feature per PR** - Keep PRs focused and easy to review
- **Update README** - If adding new features, document them
- **Test both frameworks** - Ensure changes work in Vite and Next.js
- **Follow existing patterns** - Match the code style of existing files

### Ideas for Contributions

- 🎨 **New input types** - Border radius editor, font picker, spacing editor
- 🤖 **MCP enhancements** - Auto-tune mode, design system validation, accessibility audits
- ◎ **Discovery Mode** - Auto-generate `useTangent()` code from inspected elements
- 🌐 **Internationalization** - Translate UI text
- ♿ **Accessibility** - Improve keyboard navigation and screen reader support
- 📚 **Documentation** - Tutorials, examples, better API docs
- 🧪 **Testing** - Unit tests, integration tests, E2E tests
- 🐛 **Bug fixes** - Check issues for reported bugs

### Reporting Issues

When reporting bugs, please include:

- Browser and OS version
- Framework (Vite/Next.js) and version
- Steps to reproduce
- Expected vs actual behavior

## Packages

| Package               | Description                                          |
| --------------------- | ---------------------------------------------------- |
| `tangent-core`        | React hooks, UI components, schema, and event bus    |
| `vite-plugin-tangent` | Vite plugin with dev server middleware and state API  |
| `next-plugin-tangent` | Next.js plugin with API route handlers               |
| `tangent-mcp`         | MCP server for AI agent integration                  |
| `tangent-transform`   | Shared source code transformation logic              |

## License

MIT
