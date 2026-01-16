import { useTangentContext } from '../context/TangentContext'
import { NumberInput } from './inputs/NumberInput'
import { ColorInput } from './inputs/ColorInput'
import { StringInput } from './inputs/StringInput'
import { BooleanInput } from './inputs/BooleanInput'
import { CodePreview } from './CodePreview'
import type { TangentValue } from '../types'

export function ControlPanel() {
  const { registrations, updateValue, setIsOpen, showCode, setShowCode } = useTangentContext()

  const renderInput = (
    registrationId: string,
    key: string,
    value: TangentValue,
    onChange: (value: TangentValue) => void
  ) => {
    if (typeof value === 'number') {
      return <NumberInput value={value} onChange={onChange} />
    }
    if (typeof value === 'string') {
      if (value.startsWith('#') || value.startsWith('rgb')) {
        return <ColorInput value={value} onChange={onChange} />
      }
      return <StringInput value={value} onChange={onChange} />
    }
    if (typeof value === 'boolean') {
      return <BooleanInput value={value} onChange={onChange} />
    }
    return null
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>◈</span>
          <span style={styles.logoText}>TANGENT</span>
        </div>
        <div style={styles.headerActions}>
          <button
            style={{
              ...styles.codeButton,
              backgroundColor: showCode ? 'rgba(0, 212, 255, 0.2)' : 'transparent',
              borderColor: showCode ? 'rgba(0, 212, 255, 0.5)' : 'rgba(255, 255, 255, 0.1)',
            }}
            onClick={() => setShowCode(!showCode)}
            title="Toggle code preview"
          >
            {'</>'}
          </button>
          <button style={styles.closeButton} onClick={() => setIsOpen(false)}>
            ✕
          </button>
        </div>
      </div>

      <div style={styles.content}>
        {Array.from(registrations.entries()).map(([id, registration]) => (
          <div key={id} style={styles.section}>
            <div style={styles.sectionHeader}>{id}</div>
            <div style={styles.controls}>
              {Object.entries(registration.currentConfig).map(([key, currentValue]) => (
                <div key={key} style={styles.controlRow}>
                  <label style={styles.label}>{key}</label>
                  {renderInput(id, key, currentValue, (value) =>
                    updateValue(id, key, value)
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showCode && <CodePreview registrations={registrations} />}

      <div style={styles.footer}>
        <span style={styles.shortcut}>⌘⇧T to toggle</span>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    width: '340px',
    maxHeight: 'calc(100vh - 40px)',
    backgroundColor: 'rgba(13, 13, 18, 0.95)',
    borderRadius: '12px',
    border: '1px solid rgba(0, 255, 159, 0.2)',
    boxShadow: '0 0 30px rgba(0, 255, 159, 0.1), inset 0 0 30px rgba(0, 0, 0, 0.5)',
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    fontSize: '12px',
    color: '#e0e0e0',
    overflow: 'hidden',
    zIndex: 999999,
    backdropFilter: 'blur(10px)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(0, 255, 159, 0.15)',
    background: 'linear-gradient(180deg, rgba(0, 255, 159, 0.08) 0%, transparent 100%)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  logoIcon: {
    color: '#00ff9f',
    fontSize: '16px',
    textShadow: '0 0 10px rgba(0, 255, 159, 0.8)',
  },
  logoText: {
    fontWeight: 700,
    fontSize: '13px',
    letterSpacing: '2px',
    background: 'linear-gradient(90deg, #00ff9f, #00d4ff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  codeButton: {
    background: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '4px',
    color: '#00d4ff',
    cursor: 'pointer',
    padding: '4px 8px',
    fontSize: '12px',
    fontFamily: 'inherit',
    fontWeight: 600,
    transition: 'all 0.2s',
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    color: '#666',
    cursor: 'pointer',
    padding: '4px 8px',
    fontSize: '14px',
    transition: 'color 0.2s',
  },
  content: {
    padding: '12px',
    overflowY: 'auto',
    flex: 1,
  },
  section: {
    marginBottom: '16px',
  },
  sectionHeader: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#00ff9f',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid rgba(0, 255, 159, 0.1)',
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  controlRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  label: {
    color: '#888',
    fontSize: '11px',
    minWidth: '80px',
  },
  footer: {
    padding: '8px 16px',
    borderTop: '1px solid rgba(0, 255, 159, 0.1)',
    textAlign: 'center',
  },
  shortcut: {
    color: '#555',
    fontSize: '10px',
  },
}
