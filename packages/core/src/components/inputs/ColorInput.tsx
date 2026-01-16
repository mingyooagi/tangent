interface ColorInputProps {
  value: string
  onChange: (value: string) => void
}

function normalizeHex(hex: string): string {
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    const r = hex[1]
    const g = hex[2]
    const b = hex[3]
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return hex
}

export function ColorInput({ value, onChange }: ColorInputProps) {
  const normalizedValue = normalizeHex(value)
  
  return (
    <div style={styles.container}>
      <input
        type="color"
        value={normalizedValue}
        onChange={(e) => onChange(e.target.value)}
        style={styles.colorPicker}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={styles.textInput}
      />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
  },
  colorPicker: {
    width: '28px',
    height: '28px',
    padding: 0,
    border: '1px solid rgba(0, 255, 159, 0.3)',
    borderRadius: '4px',
    cursor: 'pointer',
    backgroundColor: 'transparent',
  },
  textInput: {
    flex: 1,
    padding: '4px 6px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(0, 255, 159, 0.2)',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '11px',
    fontFamily: 'inherit',
  },
}
