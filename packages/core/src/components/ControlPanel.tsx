import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useTangentContext } from '../context/TangentContext'
import { NumberInput } from './inputs/NumberInput'
import { ColorInput } from './inputs/ColorInput'
import { StringInput } from './inputs/StringInput'
import { EasingInput } from './inputs/EasingInput'
import { BooleanInput } from './inputs/BooleanInput'
import { BoxShadowInput } from './inputs/BoxShadowInput'
import { GradientInput } from './inputs/GradientInput'
import { CodePreview } from './CodePreview'
import type { TangentValue } from '../types'

const EASING_KEYWORDS = ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out']

type InputType = 'number' | 'color' | 'string' | 'easing' | 'boolean' | 'boxshadow' | 'gradient'

function detectInputType(value: TangentValue, key: string): InputType {
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'string') {
    const keyLower = key.toLowerCase()
    if (keyLower.includes('shadow')) return 'boxshadow'
    if (keyLower.includes('gradient')) return 'gradient'
    if (keyLower.includes('easing') || keyLower.includes('timing') || keyLower.includes('transition')) {
      if (value.includes('cubic-bezier') || EASING_KEYWORDS.includes(value)) return 'easing'
    }
    
    if (value.includes('linear-gradient') || value.includes('radial-gradient')) return 'gradient'
    if (/^(inset\s+)?-?\d+px\s+-?\d+px\s+\d+px/.test(value)) return 'boxshadow'
    if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl')) return 'color'
    if (value.includes('cubic-bezier') || EASING_KEYWORDS.includes(value)) return 'easing'
    return 'string'
  }
  return 'string'
}

const VIEWPORT_ICONS: Record<string, string> = {
  mobile: '📱',
  tablet: '📟',
  desktop: '🖥',
  full: '⬜',
}

interface Position { x: number; y: number }

function getInitialPosition(): Position {
  if (typeof window === 'undefined') return { x: 20, y: 20 }
  return { x: window.innerWidth - 360, y: 20 }
}

// Custom scrollbar styles (injected once)
const scrollbarStyleId = 'tangent-scrollbar-styles'
function injectScrollbarStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById(scrollbarStyleId)) return
  
  const style = document.createElement('style')
  style.id = scrollbarStyleId
  style.textContent = `
    [data-tangent-panel] *::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    [data-tangent-panel] *::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 3px;
    }
    [data-tangent-panel] *::-webkit-scrollbar-thumb {
      background: rgba(0, 255, 159, 0.3);
      border-radius: 3px;
    }
    [data-tangent-panel] *::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 255, 159, 0.5);
    }
  `
  document.head.appendChild(style)
}

export function ControlPanel() {
  const { registrations, updateValue, setIsOpen, showCode, setShowCode, showSpacing, setShowSpacing, viewport, setViewport, historyState, undo, redo } = useTangentContext()
  
  const [collapsed, setCollapsed] = useState(false)
  const [position, setPosition] = useState<Position>(getInitialPosition)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [width, setWidth] = useState(340)
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  
  const dragOffset = useRef<Position>({ x: 0, y: 0 })
  const panelRef = useRef<HTMLDivElement>(null)
  const inputTypesRef = useRef<Map<string, InputType>>(new Map())

  useEffect(() => {
    injectScrollbarStyles()
    setPosition({ x: window.innerWidth - 360, y: 20 })
  }, [])

  const getInputType = useCallback((registrationId: string, key: string, value: TangentValue): InputType => {
    const cacheKey = `${registrationId}:${key}`
    if (!inputTypesRef.current.has(cacheKey)) {
      inputTypesRef.current.set(cacheKey, detectInputType(value, key))
    }
    return inputTypesRef.current.get(cacheKey)!
  }, [])

  const toggleSection = useCallback((id: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, [data-no-drag]')) return
    setIsDragging(true)
    dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y }
    e.preventDefault()
  }, [position])

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    setIsResizing(true)
    e.preventDefault()
    e.stopPropagation()
  }, [])

  useEffect(() => {
    if (!isDragging && !isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(0, Math.min(window.innerWidth - width, e.clientX - dragOffset.current.x))
        const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.current.y))
        setPosition({ x: newX, y: newY })
      }
      if (isResizing) {
        const newWidth = Math.max(280, Math.min(600, e.clientX - position.x))
        setWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isResizing, position.x, width])

  const renderInput = (
    registrationId: string,
    key: string,
    value: TangentValue,
    onChange: (value: TangentValue) => void
  ) => {
    const inputType = getInputType(registrationId, key, value)
    
    switch (inputType) {
      case 'number':
        return <NumberInput value={value as number} onChange={onChange} />
      case 'boxshadow':
        return <BoxShadowInput value={value as string} onChange={onChange} />
      case 'gradient':
        return <GradientInput value={value as string} onChange={onChange} />
      case 'color':
        return <ColorInput value={value as string} onChange={onChange} />
      case 'easing':
        return <EasingInput value={value as string} onChange={onChange} />
      case 'boolean':
        return <BooleanInput value={value as boolean} onChange={onChange} />
      case 'string':
      default:
        return <StringInput value={value as string} onChange={onChange} />
    }
  }

  // Sort and filter registrations
  const filteredRegistrations = useMemo(() => {
    const sorted = Array.from(registrations.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    
    if (!searchQuery.trim()) return sorted
    
    const query = searchQuery.toLowerCase()
    return sorted
      .map(([id, registration]) => {
        // Filter keys that match the search
        const matchingKeys = Object.keys(registration.currentConfig).filter(key => 
          key.toLowerCase().includes(query) || id.toLowerCase().includes(query)
        )
        
        if (matchingKeys.length === 0 && !id.toLowerCase().includes(query)) {
          return null
        }
        
        return [id, registration, matchingKeys.length > 0 ? matchingKeys : Object.keys(registration.currentConfig)] as const
      })
      .filter((item): item is [string, typeof registrations extends Map<string, infer V> ? V : never, string[]] => item !== null)
  }, [registrations, searchQuery])

  // Count total controls
  const totalControls = useMemo(() => {
    return Array.from(registrations.values()).reduce((sum, reg) => sum + Object.keys(reg.currentConfig).length, 0)
  }, [registrations])

  return (
    <div 
      ref={panelRef}
      style={{
        ...styles.container,
        left: position.x,
        top: position.y,
        width: collapsed ? 'auto' : width,
        cursor: isDragging ? 'grabbing' : 'default',
      }} 
      data-tangent-panel
    >
      <div 
        style={{
          ...styles.header,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleMouseDown}
      >
        <div style={styles.logo}>
          <span style={styles.logoIcon}>◈</span>
          {!collapsed && <span style={styles.logoText}>TANGENT</span>}
        </div>
        <div style={styles.headerActions}>
          {!collapsed && (
            <>
              <button
                style={{
                  ...styles.historyButton,
                  opacity: historyState.canUndo ? 1 : 0.3,
                  cursor: historyState.canUndo ? 'pointer' : 'default',
                }}
                onClick={undo}
                disabled={!historyState.canUndo}
                title="Undo (⌘Z)"
              >
                ↶
              </button>
              <button
                style={{
                  ...styles.historyButton,
                  opacity: historyState.canRedo ? 1 : 0.3,
                  cursor: historyState.canRedo ? 'pointer' : 'default',
                }}
                onClick={redo}
                disabled={!historyState.canRedo}
                title="Redo (⌘⇧Z)"
              >
                ↷
              </button>
              <button
                style={{
                  ...styles.iconButton,
                  backgroundColor: showSpacing ? 'rgba(0, 255, 159, 0.2)' : 'transparent',
                }}
                onClick={() => setShowSpacing(!showSpacing)}
                title="Toggle spacing visualization (⌘⇧S)"
              >
                ⬚
              </button>
              <div style={styles.viewportPicker}>
                {(['mobile', 'tablet', 'desktop', 'full'] as const).map((size) => (
                  <button
                    key={size}
                    style={{
                      ...styles.viewportButton,
                      backgroundColor: viewport === size ? 'rgba(255, 165, 0, 0.2)' : 'transparent',
                      color: viewport === size ? '#ffa500' : '#666',
                    }}
                    onClick={() => setViewport(size)}
                    title={`${size.charAt(0).toUpperCase() + size.slice(1)} view`}
                  >
                    {VIEWPORT_ICONS[size]}
                  </button>
                ))}
              </div>
              <button
                style={{
                  ...styles.iconButton,
                  backgroundColor: showCode ? 'rgba(0, 212, 255, 0.2)' : 'transparent',
                }}
                onClick={() => setShowCode(!showCode)}
                title="Toggle code preview"
              >
                {'</>'}
              </button>
            </>
          )}
          <button 
            style={styles.collapseButton} 
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand panel' : 'Collapse panel'}
          >
            {collapsed ? '◀' : '▼'}
          </button>
          <button style={styles.closeButton} onClick={() => setIsOpen(false)} title="Close (⌘⇧T)">
            ✕
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Search bar */}
          <div style={styles.searchContainer}>
            <input
              type="text"
              placeholder={`Search ${totalControls} controls...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
              data-no-drag
            />
            {searchQuery && (
              <button 
                style={styles.clearSearch}
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div style={styles.content}>
            {filteredRegistrations.length === 0 ? (
              <div style={styles.noResults}>
                No controls match "{searchQuery}"
              </div>
            ) : (
              filteredRegistrations.map(([id, registration, keys]) => {
                const isCollapsed = collapsedSections.has(id)
                const sortedKeys = (keys || Object.keys(registration.currentConfig)).sort()
                const controlCount = Object.keys(registration.currentConfig).length
                
                return (
                  <div key={id} style={styles.section}>
                    <button 
                      style={styles.sectionHeader}
                      onClick={() => toggleSection(id)}
                      title={isCollapsed ? 'Expand section' : 'Collapse section'}
                    >
                      <span style={styles.sectionToggle}>{isCollapsed ? '▶' : '▼'}</span>
                      <span style={styles.sectionTitle}>{id}</span>
                      <span style={styles.sectionCount}>{controlCount}</span>
                    </button>
                    
                    {!isCollapsed && (
                      <div style={styles.controls}>
                        {sortedKeys.map((key) => {
                          const currentValue = registration.currentConfig[key]
                          if (currentValue === undefined) return null
                          
                          return (
                            <div key={`${id}-${key}`} style={styles.controlRow}>
                              <label style={styles.label}>{key}</label>
                              <div style={styles.inputWrapper} data-no-drag>
                                {renderInput(id, key, currentValue, (value) =>
                                  updateValue(id, key, value)
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {showCode && <CodePreview registrations={registrations} />}

          <div style={styles.footer}>
            <span style={styles.shortcut}>⌘⇧T toggle · drag to move · click section to collapse</span>
          </div>

          <div 
            style={styles.resizeHandle}
            onMouseDown={handleResizeStart}
            title="Drag to resize"
          />
        </>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    maxHeight: 'calc(100vh - 40px)',
    backgroundColor: 'rgba(13, 13, 18, 0.95)',
    borderRadius: '12px',
    border: '1px solid rgba(0, 255, 159, 0.2)',
    boxShadow: '0 0 30px rgba(0, 255, 159, 0.1), 0 10px 40px rgba(0, 0, 0, 0.5)',
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    fontSize: '12px',
    color: '#e0e0e0',
    overflow: 'hidden',
    zIndex: 999999,
    backdropFilter: 'blur(10px)',
    display: 'flex',
    flexDirection: 'column',
    userSelect: 'none',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderBottom: '1px solid rgba(0, 255, 159, 0.15)',
    background: 'linear-gradient(180deg, rgba(0, 255, 159, 0.08) 0%, transparent 100%)',
    flexShrink: 0,
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
    fontSize: '12px',
    letterSpacing: '2px',
    background: 'linear-gradient(90deg, #00ff9f, #00d4ff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  historyButton: {
    background: 'transparent',
    border: 'none',
    color: '#00ff9f',
    cursor: 'pointer',
    padding: '4px 5px',
    fontSize: '14px',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
  },
  iconButton: {
    background: 'transparent',
    border: 'none',
    borderRadius: '4px',
    color: '#00d4ff',
    cursor: 'pointer',
    padding: '4px 6px',
    fontSize: '11px',
    fontFamily: 'inherit',
    fontWeight: 600,
    transition: 'all 0.2s',
  },
  viewportPicker: {
    display: 'flex',
    gap: '1px',
    padding: '2px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '4px',
  },
  viewportButton: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 4px',
    fontSize: '10px',
    borderRadius: '3px',
    transition: 'all 0.2s',
  },
  collapseButton: {
    background: 'transparent',
    border: 'none',
    color: '#666',
    cursor: 'pointer',
    padding: '4px 6px',
    fontSize: '10px',
    transition: 'color 0.2s',
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    color: '#666',
    cursor: 'pointer',
    padding: '4px 6px',
    fontSize: '12px',
    transition: 'color 0.2s',
  },
  searchContainer: {
    position: 'relative',
    padding: '8px 12px',
    borderBottom: '1px solid rgba(0, 255, 159, 0.1)',
    flexShrink: 0,
  },
  searchInput: {
    width: '100%',
    padding: '6px 28px 6px 10px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(0, 255, 159, 0.2)',
    borderRadius: '6px',
    color: '#e0e0e0',
    fontSize: '11px',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  },
  clearSearch: {
    position: 'absolute',
    right: '18px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    color: '#666',
    cursor: 'pointer',
    padding: '2px 4px',
    fontSize: '10px',
  },
  content: {
    padding: '8px 12px',
    overflowY: 'auto',
    flex: 1,
    minHeight: 0,
  },
  noResults: {
    padding: '20px',
    textAlign: 'center',
    color: '#666',
    fontSize: '11px',
  },
  section: {
    marginBottom: '8px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    width: '100%',
    padding: '6px 8px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#00ff9f',
    backgroundColor: 'rgba(0, 255, 159, 0.05)',
    border: '1px solid rgba(0, 255, 159, 0.1)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'left',
    transition: 'all 0.15s',
  },
  sectionToggle: {
    fontSize: '8px',
    color: '#666',
    width: '10px',
  },
  sectionTitle: {
    flex: 1,
  },
  sectionCount: {
    fontSize: '9px',
    color: '#666',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: '2px 6px',
    borderRadius: '10px',
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '10px 0 0 0',
  },
  controlRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    color: '#888',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  inputWrapper: {
    flex: 1,
  },
  footer: {
    padding: '6px 12px',
    borderTop: '1px solid rgba(0, 255, 159, 0.1)',
    textAlign: 'center',
    flexShrink: 0,
  },
  shortcut: {
    color: '#555',
    fontSize: '9px',
  },
  resizeHandle: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '6px',
    cursor: 'ew-resize',
    background: 'transparent',
  },
}
