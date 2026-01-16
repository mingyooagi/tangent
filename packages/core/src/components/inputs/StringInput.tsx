interface StringInputProps {
  value: string
  onChange: (value: string) => void
}

export function StringInput({ value, onChange }: StringInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={styles.input}
    />
  )
}

const styles: Record<string, React.CSSProperties> = {
  input: {
    flex: 1,
    padding: '6px 8px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(0, 255, 159, 0.2)',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '11px',
    fontFamily: 'inherit',
  },
}
