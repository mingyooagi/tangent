# Tangent

Visual Tuner for AI-generated code. Adjust UI values in the browser and save changes directly to source files.

![Tangent Demo](https://via.placeholder.com/800x400?text=Tangent+Demo)

## Features

- 🎛️ **Visual Controls** - Sliders, color pickers, and text inputs for tuning values
- 💾 **Auto-save to Source** - Changes are written back to your source files via AST modification
- ⚡ **Hot Reload** - See changes instantly in the browser
- 🎨 **Cyberpunk Theme** - Dark mode UI that stays out of your way
- 📋 **Copy Prompt** - Copy changes in AI-friendly format
- 🔧 **Framework Support** - Works with Vite and Next.js

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
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tangent from 'vite-plugin-tangent'

export default defineConfig({
  plugins: [react(), tangent()],
})
```

**Next.js** (`next.config.js`):

```js
const { withTangent } = require('next-plugin-tangent')

module.exports = withTangent({
  // your next config
})
```

### 2. Add Provider

**Vite** (`App.tsx`):

```tsx
import { TangentProvider } from 'tangent-core'

function App() {
  return (
    <TangentProvider>
      {/* your app */}
    </TangentProvider>
  )
}
```

**Next.js** (`layout.tsx`):

```tsx
'use client'

import { TangentProvider } from 'tangent-core'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <TangentProvider endpoint="/api/tangent/update">
          {children}
        </TangentProvider>
      </body>
    </html>
  )
}
```

### 3. Create API Route (Next.js only)

Create `app/api/tangent/update/route.ts`:

```ts
import { POST, GET } from 'next-plugin-tangent/api'
export { POST, GET }
```

### 4. Use the Hook

```tsx
import { useTangent } from 'tangent-core'

function Hero() {
  const styles = useTangent('HeroSection', {
    padding: 60,
    headerColor: '#00ff9f',
    fontSize: 48,
    opacity: 1,
  })

  return (
    <div style={{ padding: styles.padding }}>
      <h1 style={{ 
        color: styles.headerColor,
        fontSize: styles.fontSize,
        opacity: styles.opacity,
      }}>
        Welcome
      </h1>
    </div>
  )
}
```

## Usage

Once set up, a floating control panel appears in your app:

- **Adjust values** using sliders, color pickers, or text inputs
- **Toggle panel** with `⌘⇧T` (or `Ctrl+Shift+T`)
- **View changes** by clicking the `</>` button
- **Copy for AI** to get changes in a format ready to paste into AI chat

## Supported Value Types

| Type | Control | Example |
|------|---------|---------|
| `number` | Slider + input | `padding: 60` |
| `string` (hex color) | Color picker | `color: '#00ff9f'` |
| `string` (other) | Text input | `text: 'Hello'` |
| `boolean` | Toggle | `visible: true` |

## How It Works

1. `useTangent` registers tunable values with the control panel
2. When you adjust a value, Tangent sends a request to the dev server
3. The server uses AST modification (via [magicast](https://github.com/unjs/magicast)) to update the source file
4. Your bundler's HMR picks up the change and hot reloads

## API

### `useTangent(id, defaultValues)`

```ts
const values = useTangent('ComponentName', {
  padding: 60,
  color: '#fff',
})
```

- `id` - Unique identifier for this set of values
- `defaultValues` - Object with default values (number, string, or boolean)
- Returns the current values object

### `<TangentProvider>`

```tsx
<TangentProvider endpoint="/api/tangent/update">
  {children}
</TangentProvider>
```

Props:
- `endpoint` - API endpoint for updates (default: `/__tangent/update` for Vite)

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘⇧T` / `Ctrl+Shift+T` | Toggle control panel |

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

## Packages

| Package | Description |
|---------|-------------|
| `tangent-core` | React hooks and UI components |
| `vite-plugin-tangent` | Vite plugin with dev server middleware |
| `next-plugin-tangent` | Next.js plugin with API route handlers |
| `tangent-transform` | Shared source code transformation logic |

## License

MIT
