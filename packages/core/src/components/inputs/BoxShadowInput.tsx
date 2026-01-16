import { useState, useEffect } from 'react'

interface BoxShadowInputProps {
  value: string
  onChange: (value: string) => void
}

interface ShadowValues {
  x: number
  y: number
  blur: number
  spread: number
  color: string
  inset: boolean
}

function parseBoxShadow(value: string): ShadowValues {
  const defaults: ShadowValues = { x: 0, y: 4, blur: 10, spread: 0, color: 'rgba(0,0,0,0.25)', inset: false }
  
  if (!value || value === 'none') return defaults
  
  const inset = value.includes('inset')
  const cleanValue = value.replace('inset', '').trim()
  
  const colorMatch = cleanValue.match(/(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))/i)
  const color = colorMatch ? colorMatch[1] : defaults.color
  
  const withoutColor = cleanValue.replace(/(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))/gi, '').trim()
  const numbers = withoutColor.match(/-?\d+(\.\d+)?/g)?.map(Number) || []
  
  return {
    x: numbers[0] ?? defaults.x,
    y: numbers[1] ?? defaults.y,
    blur: numbers[2] ?? defaults.blur,
    spread: numbers[3] ?? defaults.spread,
    color,
    inset,
  }
}

function buildBoxShadow(values: ShadowValues): string {
  const { x, y, blur, spread, color, inset } = values
  const parts = [
    inset ? 'inset' : '',
    `${x}px`,
    `${y}px`,
    `${blur}px`,
    `${spread}px`,
    color,
  ].filter(Boolean)
  return parts.join(' ')
}

function rgbaToHex(rgba: string): string {
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!match) return rgba.startsWith('#') ? rgba : '#000000'
  const [, r, g, b] = match.map(Number)
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
}

export function BoxShadowInput({ value, onChange }: BoxShadowInputProps) {
  const [shadow, setShadow] = useState<ShadowValues>(() => parseBoxShadow(value))

  useEffect(() => {
    setShadow(parseBoxShadow(value))
  }, [value])

  const updateShadow = (updates: Partial<ShadowValues>) => {
    const newShadow = { ...shadow, ...updates }
    setShadow(newShadow)
    onChange(buildBoxShadow(newShadow))
  }

  const hexColor = rgbaToHex(shadow.color)

  return (
    <div style={styles.container}>
      {/* Preview with checkerboard background for transparency */}
      <div style={styles.previewWrapper}>
        <div style={styles.previewLabel}>Shadow Preview</div>
        <div style={styles.preview}>
          <div style={styles.checkerboard} />
          <div style={{ ...styles.previewBox, boxShadow: buildBoxShadow(shadow) }} />
        </div>
      </div>
      
      <div style={styles.controls}>
        <div style={styles.row}>
          <label style={styles.label}>X</label>
          <input
            type="range"
            min={-50}
            max={50}
            value={shadow.x}
            onChange={(e) => updateShadow({ x: Number(e.target.value) })}
            style={styles.slider}
          />
          <span style={styles.value}>{shadow.x}px</span>
        </div>
        
        <div style={styles.row}>
          <label style={styles.label}>Y</label>
          <input
            type="range"
            min={-50}
            max={50}
            value={shadow.y}
            onChange={(e) => updateShadow({ y: Number(e.target.value) })}
            style={styles.slider}
          />
          <span style={styles.value}>{shadow.y}px</span>
        </div>
        
        <div style={styles.row}>
          <label style={styles.label}>Blur</label>
          <input
            type="range"
            min={0}
            max={100}
            value={shadow.blur}
            onChange={(e) => updateShadow({ blur: Number(e.target.value) })}
            style={styles.slider}
          />
          <span style={styles.value}>{shadow.blur}px</span>
        </div>
        
        <div style={styles.row}>
          <label style={styles.label}>Spread</label>
          <input
            type="range"
            min={-50}
            max={50}
            value={shadow.spread}
            onChange={(e) => updateShadow({ spread: Number(e.target.value) })}
            style={styles.slider}
          />
          <span style={styles.value}>{shadow.spread}px</span>
        </div>
        
        <div style={styles.row}>
          <label style={styles.label}>Color</label>
          <input
            type="color"
            value={hexColor}
            onChange={(e) => updateShadow({ color: e.target.value })}
            style={styles.colorPicker}
          />
          <label style={styles.insetLabel}>
            <input
              type="checkbox"
              checked={shadow.inset}
              onChange={(e) => updateShadow({ inset: e.target.checked })}
              style={styles.checkbox}
            />
            Inset
          </label>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1,
    minWidth: 0,
  },
  previewWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  previewLabel: {
    fontSize: '9px',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  preview: {
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    borderRadius: '6px',
    border: '1px solid rgba(0, 255, 159, 0.1)',
    overflow: 'hidden',
  },
  checkerboard: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `
      linear-gradient(45deg, #1a1a1f 25%, transparent 25%),
      linear-gradient(-45deg, #1a1a1f 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #1a1a1f 75%),
      linear-gradient(-45deg, transparent 75%, #1a1a1f 75%)
    `,
    backgroundSize: '12px 12px',
    backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
    backgroundColor: '#252530',
    opacity: 0.5,
  },
  previewBox: {
    position: 'relative',
    width: '50px',
    height: '50px',
    backgroundColor: '#fff',
    borderRadius: '6px',
    transition: 'box-shadow 0.15s ease',
    zIndex: 1,
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  label: {
    width: '40px',
    fontSize: '10px',
    color: '#666',
    textTransform: 'uppercase',
  },
  slider: {
    flex: 1,
    height: '4px',
    appearance: 'none',
    background: 'linear-gradient(90deg, #00ff9f, #00d4ff)',
    borderRadius: '2px',
    cursor: 'pointer',
    accentColor: '#00ff9f',
  },
  value: {
    width: '36px',
    fontSize: '10px',
    color: '#888',
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
  },
  colorPicker: {
    width: '24px',
    height: '24px',
    padding: 0,
    border: '1px solid rgba(0, 255, 159, 0.3)',
    borderRadius: '4px',
    cursor: 'pointer',
    backgroundColor: 'transparent',
  },
  insetLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '10px',
    color: '#666',
    cursor: 'pointer',
    marginLeft: 'auto',
  },
  checkbox: {
    accentColor: '#00ff9f',
  },
}
