import { useState, useCallback } from 'react'

type ViewportSize = 'mobile' | 'tablet' | 'desktop' | 'full'

const VIEWPORT_SIZES: Record<ViewportSize, { width: number; height: number; label: string; icon: string }> = {
  mobile: { width: 375, height: 667, label: 'Mobile', icon: '📱' },
  tablet: { width: 768, height: 1024, label: 'Tablet', icon: '📟' },
  desktop: { width: 1280, height: 800, label: 'Desktop', icon: '🖥' },
  full: { width: 0, height: 0, label: 'Full', icon: '⬜' },
}

interface ResponsivePreviewProps {
  children: React.ReactNode
  enabled: boolean
  viewport: ViewportSize
  onViewportChange: (viewport: ViewportSize) => void
}

export function ResponsivePreview({ children, enabled, viewport, onViewportChange }: ResponsivePreviewProps) {
  const [scale, setScale] = useState(1)
  
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setScale(prev => Math.max(0.25, Math.min(2, prev + delta)))
    }
  }, [])

  if (!enabled || viewport === 'full') {
    return <>{children}</>
  }

  const size = VIEWPORT_SIZES[viewport]

  return (
    <div style={styles.wrapper}>
      <div style={styles.toolbar} data-tangent-panel>
        <div style={styles.viewportButtons}>
          {(Object.keys(VIEWPORT_SIZES) as ViewportSize[]).map((key) => (
            <button
              key={key}
              style={{
                ...styles.viewportButton,
                backgroundColor: viewport === key ? 'rgba(0, 255, 159, 0.2)' : 'transparent',
                borderColor: viewport === key ? 'rgba(0, 255, 159, 0.5)' : 'rgba(255, 255, 255, 0.2)',
              }}
              onClick={() => onViewportChange(key)}
              title={`${VIEWPORT_SIZES[key].label} (${key === 'full' ? 'Full width' : `${VIEWPORT_SIZES[key].width}×${VIEWPORT_SIZES[key].height}`})`}
            >
              {VIEWPORT_SIZES[key].icon}
            </button>
          ))}
        </div>
        <div style={styles.info}>
          {size.width} × {size.height} @ {Math.round(scale * 100)}%
        </div>
        <div style={styles.scaleControls}>
          <button
            style={styles.scaleButton}
            onClick={() => setScale(prev => Math.max(0.25, prev - 0.25))}
          >
            −
          </button>
          <button
            style={styles.scaleButton}
            onClick={() => setScale(1)}
          >
            1:1
          </button>
          <button
            style={styles.scaleButton}
            onClick={() => setScale(prev => Math.min(2, prev + 0.25))}
          >
            +
          </button>
        </div>
      </div>
      <div 
        style={styles.previewContainer}
        onWheel={handleWheel}
      >
        <div
          style={{
            ...styles.frame,
            width: size.width,
            height: size.height,
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
          }}
        >
          <div style={styles.frameContent}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ResponsiveToolbar({ 
  viewport, 
  onViewportChange 
}: { 
  viewport: ViewportSize
  onViewportChange: (viewport: ViewportSize) => void 
}) {
  return (
    <div style={styles.inlineToolbar}>
      {(Object.keys(VIEWPORT_SIZES) as ViewportSize[]).map((key) => (
        <button
          key={key}
          style={{
            ...styles.inlineButton,
            backgroundColor: viewport === key ? 'rgba(0, 255, 159, 0.2)' : 'transparent',
            color: viewport === key ? '#00ff9f' : '#888',
          }}
          onClick={() => onViewportChange(key)}
          title={VIEWPORT_SIZES[key].label}
        >
          {VIEWPORT_SIZES[key].icon}
        </button>
      ))}
    </div>
  )
}

export type { ViewportSize }

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#1a1a1f',
    overflow: 'hidden',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '8px 16px',
    backgroundColor: 'rgba(13, 13, 18, 0.95)',
    borderBottom: '1px solid rgba(0, 255, 159, 0.2)',
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    fontSize: '12px',
    color: '#888',
    flexShrink: 0,
  },
  viewportButtons: {
    display: 'flex',
    gap: '4px',
  },
  viewportButton: {
    background: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '4px',
    cursor: 'pointer',
    padding: '6px 10px',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  info: {
    color: '#666',
    fontSize: '11px',
    minWidth: '120px',
    textAlign: 'center',
  },
  scaleControls: {
    display: 'flex',
    gap: '2px',
  },
  scaleButton: {
    background: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '4px',
    color: '#888',
    cursor: 'pointer',
    padding: '4px 8px',
    fontSize: '12px',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
  },
  previewContainer: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: '24px',
    overflow: 'auto',
    backgroundColor: '#0d0d12',
  },
  frame: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.1), 0 20px 60px rgba(0, 0, 0, 0.5)',
    overflow: 'hidden',
    position: 'relative',
  },
  frameContent: {
    width: '100%',
    height: '100%',
    overflow: 'auto',
  },
  inlineToolbar: {
    display: 'flex',
    gap: '2px',
  },
  inlineButton: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 6px',
    fontSize: '12px',
    borderRadius: '4px',
    transition: 'all 0.2s',
  },
}
