import { useState } from 'react'
import type { TangentRegistration } from '../types'

interface CodePreviewProps {
  registrations: Map<string, TangentRegistration>
}

export function CodePreview({ registrations }: CodePreviewProps) {
  const [copied, setCopied] = useState(false)

  const generateDiff = (registration: TangentRegistration): DiffLine[] => {
    const { originalConfig, currentConfig } = registration
    const lines: DiffLine[] = []

    for (const key of Object.keys(originalConfig)) {
      const originalValue = originalConfig[key]
      const currentValue = currentConfig[key]

      if (originalValue !== currentValue) {
        lines.push({
          type: 'removed',
          content: `  ${key}: ${formatValue(originalValue)},`,
        })
        lines.push({
          type: 'added',
          content: `  ${key}: ${formatValue(currentValue)},`,
        })
      } else {
        lines.push({
          type: 'unchanged',
          content: `  ${key}: ${formatValue(currentValue)},`,
        })
      }
    }

    return lines
  }

  const getRelativePath = (filePath: string): string => {
    const parts = filePath.split('/')
    const srcIndex = parts.findIndex(p => p === 'src')
    if (srcIndex !== -1) {
      return parts.slice(srcIndex).join('/')
    }
    return parts.slice(-2).join('/')
  }

  const generateFullCode = (registration: TangentRegistration): string => {
    const { id, filePath, currentConfig } = registration
    const relativePath = getRelativePath(filePath)
    const entries = Object.entries(currentConfig)
      .map(([key, value]) => `  ${key}: ${formatValue(value)},`)
      .join('\n')

    return `// ${relativePath}\nconst styles = useTangent('${id}', {\n${entries}\n})`
  }

  const getAllCode = (): string => {
    return Array.from(registrations.values())
      .map(generateFullCode)
      .join('\n\n')
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getAllCode())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('[tangent] Failed to copy:', err)
    }
  }

  const hasChanges = Array.from(registrations.values()).some(reg =>
    Object.keys(reg.originalConfig).some(
      key => reg.originalConfig[key] !== reg.currentConfig[key]
    )
  )

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>CODE CHANGES</span>
        <button
          style={{
            ...styles.copyButton,
            backgroundColor: copied ? 'rgba(0, 255, 159, 0.2)' : 'transparent',
          }}
          onClick={handleCopy}
        >
          {copied ? '✓ Copied' : 'Copy Prompt'}
        </button>
      </div>

      {!hasChanges ? (
        <div style={styles.noChanges}>No changes yet</div>
      ) : (
        <div style={styles.diffContainer}>
          {Array.from(registrations.entries()).map(([id, registration]) => {
            const diff = generateDiff(registration)
            const hasRegChanges = diff.some(line => line.type !== 'unchanged')

            if (!hasRegChanges) return null

            const relativePath = getRelativePath(registration.filePath)

            return (
              <div key={id} style={styles.section}>
                <div style={styles.filePath}>{relativePath}</div>
                <div style={styles.codeBlock}>
                  <div style={styles.line}>
                    <span style={styles.linePrefix}> </span>
                    <span style={styles.keyword}>const</span>
                    <span> styles = </span>
                    <span style={styles.function}>useTangent</span>
                    <span>(</span>
                    <span style={styles.string}>'{id}'</span>
                    <span>, {'{'}</span>
                  </div>
                  {diff.map((line, index) => (
                    <div
                      key={index}
                      style={{
                        ...styles.line,
                        ...(line.type === 'added' ? styles.lineAdded : {}),
                        ...(line.type === 'removed' ? styles.lineRemoved : {}),
                      }}
                    >
                      <span style={styles.linePrefix}>
                        {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                      </span>
                      <span>{line.content}</span>
                    </div>
                  ))}
                  <div style={styles.line}>
                    <span style={styles.linePrefix}> </span>
                    <span>{'}'})</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged'
  content: string
}

function formatValue(value: unknown): string {
  if (typeof value === 'string') {
    return `'${value}'`
  }
  return String(value)
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    borderTop: '1px solid rgba(0, 255, 159, 0.15)',
    marginTop: '8px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
  },
  title: {
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '1px',
    color: '#00d4ff',
  },
  copyButton: {
    background: 'transparent',
    border: '1px solid rgba(0, 255, 159, 0.3)',
    borderRadius: '4px',
    color: '#00ff9f',
    cursor: 'pointer',
    padding: '4px 8px',
    fontSize: '10px',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
  },
  noChanges: {
    padding: '12px',
    color: '#555',
    fontSize: '11px',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  diffContainer: {
    padding: '0 12px 12px',
  },
  section: {
    marginBottom: '12px',
  },
  filePath: {
    fontSize: '10px',
    color: '#888',
    marginBottom: '6px',
    fontStyle: 'italic',
  },
  codeBlock: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '6px',
    padding: '8px',
    fontSize: '11px',
    fontFamily: 'inherit',
    overflow: 'auto',
  },
  line: {
    display: 'flex',
    padding: '1px 0',
    color: '#ccc',
  },
  lineAdded: {
    color: '#00ff9f',
    backgroundColor: 'rgba(0, 255, 159, 0.1)',
  },
  lineRemoved: {
    color: '#ff6b6b',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    textDecoration: 'line-through',
  },
  linePrefix: {
    width: '16px',
    flexShrink: 0,
    fontWeight: 600,
  },
  keyword: {
    color: '#ff79c6',
  },
  function: {
    color: '#50fa7b',
  },
  string: {
    color: '#f1fa8c',
  },
}
