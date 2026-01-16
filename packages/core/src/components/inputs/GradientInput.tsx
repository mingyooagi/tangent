import { useState, useRef, useCallback, useEffect } from 'react'

interface GradientInputProps {
  value: string
  onChange: (value: string) => void
}

interface ColorStop {
  color: string
  position: number
}

interface GradientValues {
  type: 'linear' | 'radial'
  angle: number
  stops: ColorStop[]
}

const CSS_COLORS = new Set([
  'transparent', 'black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple', 
  'pink', 'gray', 'grey', 'brown', 'cyan', 'magenta', 'lime', 'navy', 'teal', 'aqua',
])

const GRADIENT_KEYWORDS = new Set([
  'linear-gradient', 'radial-gradient', 'to', 'deg', 'circle', 'ellipse',
  'at', 'top', 'bottom', 'left', 'right', 'center', 'linear', 'radial', 'gradient',
])

function parseGradient(value: string): GradientValues {
  const defaults: GradientValues = {
    type: 'linear',
    angle: 90,
    stops: [
      { color: '#00ff9f', position: 0 },
      { color: '#00d4ff', position: 100 },
    ],
  }

  if (!value || !value.includes('gradient')) return defaults

  const isRadial = value.includes('radial-gradient')
  const type = isRadial ? 'radial' : 'linear'

  let angle = 90
  if (!isRadial) {
    const angleMatch = value.match(/(\d+)deg/)
    if (angleMatch) angle = Number(angleMatch[1])
  }

  const stops: ColorStop[] = []
  
  const hexMatches = value.matchAll(/(#[0-9a-fA-F]{3,8})\s*(\d+)?%?/g)
  for (const match of hexMatches) {
    stops.push({ 
      color: match[1], 
      position: match[2] ? Number(match[2]) : (stops.length === 0 ? 0 : 100) 
    })
  }

  const rgbaMatches = value.matchAll(/(rgba?\([^)]+\))\s*(\d+)?%?/g)
  for (const match of rgbaMatches) {
    stops.push({ 
      color: match[1], 
      position: match[2] ? Number(match[2]) : (stops.length === 0 ? 0 : 100) 
    })
  }

  const namedMatches = value.matchAll(/\b([a-z]+)\s+(\d+)%/gi)
  for (const match of namedMatches) {
    const color = match[1].toLowerCase()
    if (CSS_COLORS.has(color) && !GRADIENT_KEYWORDS.has(color)) {
      stops.push({ color, position: Number(match[2]) })
    }
  }

  stops.sort((a, b) => a.position - b.position)
  return { type, angle, stops: stops.length >= 2 ? stops : defaults.stops }
}

function buildGradient(g: GradientValues): string {
  const stopsStr = [...g.stops]
    .sort((a, b) => a.position - b.position)
    .map(s => `${s.color} ${s.position}%`)
    .join(', ')
  
  return g.type === 'radial' 
    ? `radial-gradient(circle, ${stopsStr})`
    : `linear-gradient(${g.angle}deg, ${stopsStr})`
}

function hexToSafe(color: string): string {
  if (color.startsWith('#')) {
    return color.length === 4 
      ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}` 
      : color
  }
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (match) {
    return '#' + [match[1], match[2], match[3]].map(x => 
      Number(x).toString(16).padStart(2, '0')
    ).join('')
  }
  return '#888888'
}

export function GradientInput({ value, onChange }: GradientInputProps) {
  const initialGradient = useRef(parseGradient(value))
  const [gradient, setGradient] = useState<GradientValues>(initialGradient.current)
  const [selectedStop, setSelectedStop] = useState(0)
  const [dragging, setDragging] = useState<number | null>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const lastValueRef = useRef(value)

  useEffect(() => {
    if (value !== lastValueRef.current && !dragging) {
      const parsed = parseGradient(value)
      setGradient(parsed)
      lastValueRef.current = value
    }
  }, [value, dragging])

  const commitChange = useCallback((newGradient: GradientValues) => {
    const newValue = buildGradient(newGradient)
    lastValueRef.current = newValue
    onChange(newValue)
  }, [onChange])

  const updateType = useCallback((type: 'linear' | 'radial') => {
    const newGradient = { ...gradient, type }
    setGradient(newGradient)
    commitChange(newGradient)
  }, [gradient, commitChange])

  const updateAngle = useCallback((angle: number) => {
    const newGradient = { ...gradient, angle }
    setGradient(newGradient)
    commitChange(newGradient)
  }, [gradient, commitChange])

  const updateStopColor = useCallback((index: number, color: string) => {
    const newStops = [...gradient.stops]
    newStops[index] = { ...newStops[index], color }
    const newGradient = { ...gradient, stops: newStops }
    setGradient(newGradient)
    commitChange(newGradient)
  }, [gradient, commitChange])

  const updateStopPosition = useCallback((index: number, position: number) => {
    const newStops = [...gradient.stops]
    newStops[index] = { ...newStops[index], position }
    setGradient({ ...gradient, stops: newStops })
  }, [gradient])

  const commitStopPosition = useCallback(() => {
    commitChange(gradient)
  }, [gradient, commitChange])

  const addStop = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current || dragging !== null) return
    const rect = barRef.current.getBoundingClientRect()
    const position = Math.round(((e.clientX - rect.left) / rect.width) * 100)
    const newStops = [...gradient.stops, { color: '#ffffff', position }]
    const newGradient = { ...gradient, stops: newStops }
    setGradient(newGradient)
    setSelectedStop(newStops.length - 1)
    commitChange(newGradient)
  }, [gradient, dragging, commitChange])

  const removeStop = useCallback((index: number) => {
    if (gradient.stops.length <= 2) return
    const newStops = gradient.stops.filter((_, i) => i !== index)
    const newGradient = { ...gradient, stops: newStops }
    setGradient(newGradient)
    setSelectedStop(Math.min(selectedStop, newStops.length - 1))
    commitChange(newGradient)
  }, [gradient, selectedStop, commitChange])

  const handleMouseDown = useCallback((index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setDragging(index)
    setSelectedStop(index)
  }, [])

  useEffect(() => {
    if (dragging === null) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!barRef.current) return
      const rect = barRef.current.getBoundingClientRect()
      const position = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100)))
      updateStopPosition(dragging, position)
    }

    const handleMouseUp = () => {
      setDragging(null)
      commitStopPosition()
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging, updateStopPosition, commitStopPosition])

  const currentStop = gradient.stops[selectedStop]

  return (
    <div style={styles.container}>
      <div 
        ref={barRef}
        style={{ ...styles.gradientBar, background: buildGradient(gradient) }}
        onClick={addStop}
      >
        {gradient.stops.map((stop, i) => (
          <div
            key={i}
            style={{
              ...styles.stopHandle,
              left: `${stop.position}%`,
              borderColor: selectedStop === i ? '#00ff9f' : 'rgba(255,255,255,0.5)',
              cursor: dragging === i ? 'grabbing' : 'grab',
            }}
            onMouseDown={(e) => handleMouseDown(i, e)}
            onDoubleClick={() => removeStop(i)}
          >
            <div style={{ ...styles.stopColor, backgroundColor: stop.color }} />
          </div>
        ))}
      </div>

      <div style={styles.controls}>
        <div style={styles.row}>
          <button
            style={{
              ...styles.typeButton,
              backgroundColor: gradient.type === 'linear' ? 'rgba(0, 255, 159, 0.2)' : 'transparent',
              color: gradient.type === 'linear' ? '#00ff9f' : '#666',
            }}
            onClick={() => updateType('linear')}
          >
            Linear
          </button>
          <button
            style={{
              ...styles.typeButton,
              backgroundColor: gradient.type === 'radial' ? 'rgba(0, 255, 159, 0.2)' : 'transparent',
              color: gradient.type === 'radial' ? '#00ff9f' : '#666',
            }}
            onClick={() => updateType('radial')}
          >
            Radial
          </button>
        </div>

        {gradient.type === 'linear' && (
          <div style={styles.row}>
            <label style={styles.label}>Angle</label>
            <input
              type="range"
              min={0}
              max={360}
              value={gradient.angle}
              onChange={(e) => updateAngle(Number(e.target.value))}
              style={styles.slider}
            />
            <span style={styles.value}>{gradient.angle}°</span>
          </div>
        )}

        {currentStop && (
          <div style={styles.row}>
            <label style={styles.label}>Stop {selectedStop + 1}</label>
            <input
              type="color"
              value={hexToSafe(currentStop.color)}
              onChange={(e) => updateStopColor(selectedStop, e.target.value)}
              style={styles.colorPicker}
            />
            <input
              type="number"
              min={0}
              max={100}
              value={currentStop.position}
              onChange={(e) => {
                updateStopPosition(selectedStop, Number(e.target.value))
                commitStopPosition()
              }}
              style={styles.posInput}
            />
            <span style={styles.value}>%</span>
          </div>
        )}
      </div>
      
      <div style={styles.hint}>Click to add · Double-click to remove</div>
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
  gradientBar: {
    position: 'relative',
    height: '28px',
    borderRadius: '6px',
    border: '1px solid rgba(0, 255, 159, 0.2)',
    cursor: 'crosshair',
  },
  stopHandle: {
    position: 'absolute',
    top: '50%',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    border: '2px solid',
    backgroundColor: '#1a1a1f',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },
  stopColor: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  typeButton: {
    flex: 1,
    padding: '5px 8px',
    fontSize: '10px',
    border: '1px solid rgba(0, 255, 159, 0.3)',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontWeight: 500,
    transition: 'all 0.15s',
  },
  label: {
    width: '45px',
    fontSize: '10px',
    color: '#666',
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
    fontSize: '10px',
    color: '#888',
    minWidth: '28px',
    textAlign: 'right',
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
  posInput: {
    width: '45px',
    padding: '4px 6px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(0, 255, 159, 0.2)',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '11px',
    textAlign: 'right',
    fontFamily: 'inherit',
  },
  hint: {
    fontSize: '9px',
    color: '#555',
    textAlign: 'center',
  },
}
