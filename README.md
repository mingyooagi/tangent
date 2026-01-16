# Tangent

Visual Tuner for AI-generated code. Adjust UI values in the browser and save changes directly to source files.

![Tangent Demo](./tangent-panel.png)

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
- 📐 **Spacing Overlay** - Visualize margins and padding

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
    heroGradient: 'linear-gradient(135deg, #00ff9f 0%, #00d4ff 100%)',
    titleShadow: '0px 4px 20px 0px rgba(0, 255, 159, 0.4)',
  })

  return (
    <div style={{ 
      padding: styles.padding,
      background: styles.heroGradient,
    }}>
      <h1 style={{ 
        color: styles.headerColor,
        fontSize: styles.fontSize,
        textShadow: styles.titleShadow,
      }}>
        Welcome
      </h1>
    </div>
  )
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

| Type | Control | Example |
|------|---------|---------|
| `number` | Slider + input | `padding: 60` |
| `string` (hex/rgb color) | Color picker | `color: '#00ff9f'` |
| `string` (gradient) | Gradient editor | `background: 'linear-gradient(...)'` |
| `string` (box-shadow) | Shadow editor | `boxShadow: '0px 4px 20px...'` |
| `string` (easing) | Curve editor | `easing: 'cubic-bezier(0.4, 0, 0.2, 1)'` |
| `string` (other) | Text input | `text: 'Hello'` |
| `boolean` | Toggle | `visible: true` |

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

| Shortcut | Action |
|----------|--------|
| `⌘⇧T` / `Ctrl+Shift+T` | Toggle control panel |
| `⌘Z` / `Ctrl+Z` | Undo |
| `⌘⇧Z` / `Ctrl+Shift+Z` | Redo |
| `⌘⇧S` / `Ctrl+Shift+S` | Toggle spacing overlay |
| `↑` / `↓` | Adjust number ±1 |
| `Shift + ↑` / `↓` | Adjust number ±10 |

## Code Preview

Click the `</>` button to open the code preview panel:

- **Diff tab** - Shows changes as a diff from original values
- **CSS Vars tab** - Exports all values as CSS custom properties

![CSS Variables Export](./tangent-css-vars.png)

```css
:root {
  --hero-section-padding: 60px;
  --hero-section-header-color: #00ff9f;
  --hero-section-hero-gradient: linear-gradient(...);
}
```

## Responsive Preview

Test your layouts at different viewport sizes:

| Icon | Size | Width |
|------|------|-------|
| 📱 | Mobile | 375px |
| 📟 | Tablet | 768px |
| 🖥 | Desktop | 1024px |
| ⬜ | Full | 100% |

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
│   ├── core/           # React hooks and UI components
│   ├── vite/           # Vite plugin
│   ├── next/           # Next.js plugin
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

| Package | Description |
|---------|-------------|
| `tangent-core` | React hooks and UI components |
| `vite-plugin-tangent` | Vite plugin with dev server middleware |
| `next-plugin-tangent` | Next.js plugin with API route handlers |
| `tangent-transform` | Shared source code transformation logic |

## License

MIT
