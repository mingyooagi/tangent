interface BooleanInputProps {
  value: boolean
  onChange: (value: boolean) => void
}

export function BooleanInput({ value, onChange }: BooleanInputProps) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        ...styles.toggle,
        backgroundColor: value ? 'rgba(0, 255, 159, 0.2)' : 'rgba(255, 255, 255, 0.05)',
        borderColor: value ? 'rgba(0, 255, 159, 0.5)' : 'rgba(255, 255, 255, 0.1)',
      }}
    >
      <span
        style={{
          ...styles.toggleKnob,
          transform: value ? 'translateX(16px)' : 'translateX(0)',
          backgroundColor: value ? '#00ff9f' : '#666',
        }}
      />
    </button>
  )
}

const styles: Record<string, React.CSSProperties> = {
  toggle: {
    width: '36px',
    height: '20px',
    padding: '2px',
    border: '1px solid',
    borderRadius: '10px',
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.2s',
  },
  toggleKnob: {
    display: 'block',
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    transition: 'all 0.2s',
  },
}
