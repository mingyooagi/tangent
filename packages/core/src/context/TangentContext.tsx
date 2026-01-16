import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { TangentContextValue, TangentRegistration, TangentValue, HistoryState, ViewportSize } from '../types'
import { ControlPanel } from '../components/ControlPanel'
import { SpacingOverlay } from '../components/SpacingOverlay'
import { ResponsivePreview } from '../components/ResponsivePreview'
import { getStoredConfig, setStoredConfig, updateStoredConfig } from '../store'
import { pushHistory, undo as undoHistory, redo as redoHistory, getHistoryState } from '../history'

const isDev = process.env.NODE_ENV === 'development'

export const TangentContext = createContext<TangentContextValue | null>(null)

interface TangentProviderProps {
  children: ReactNode
  endpoint?: string
}

const noopFn = () => {}

const prodContextValue: TangentContextValue = {
  registrations: new Map(),
  register: noopFn,
  unregister: noopFn,
  updateValue: noopFn,
  isOpen: false,
  setIsOpen: noopFn,
  showCode: false,
  setShowCode: noopFn,
  showSpacing: false,
  setShowSpacing: noopFn,
  viewport: 'full',
  setViewport: noopFn,
  endpoint: '',
  historyState: { canUndo: false, canRedo: false },
  undo: noopFn,
  redo: noopFn,
}

export function TangentProvider({ children, endpoint = '/__tangent/update' }: TangentProviderProps) {
  if (!isDev) {
    return <>{children}</>
  }

  return <TangentProviderDev endpoint={endpoint}>{children}</TangentProviderDev>
}

function TangentProviderDev({ children, endpoint }: TangentProviderProps) {
  const [registrations, setRegistrations] = useState<Map<string, TangentRegistration>>(new Map())
  const [isOpen, setIsOpen] = useState(true)
  const [showCode, setShowCode] = useState(false)
  const [showSpacing, setShowSpacing] = useState(false)
  const [viewport, setViewport] = useState<ViewportSize>('full')
  const [historyState, setHistoryState] = useState<HistoryState>({ canUndo: false, canRedo: false })

  const updateHistoryState = useCallback(() => {
    const state = getHistoryState()
    setHistoryState({ canUndo: state.canUndo, canRedo: state.canRedo })
  }, [])

  const register = useCallback((registration: TangentRegistration) => {
    const storedConfig = getStoredConfig(registration.id)
    
    if (!storedConfig) {
      setStoredConfig(registration.id, registration.originalConfig)
    }

    setRegistrations(prev => {
      const next = new Map(prev)
      next.set(registration.id, {
        ...registration,
        currentConfig: storedConfig ?? { ...registration.originalConfig },
      })
      return next
    })
  }, [])

  const unregister = useCallback((id: string) => {
    setRegistrations(prev => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [])

  const updateValue = useCallback((id: string, key: string, value: TangentValue, skipHistory = false) => {
    const registration = registrations.get(id)
    const oldValue = registration?.currentConfig[key]
    
    if (!skipHistory && oldValue !== value) {
      pushHistory(id, key, oldValue, value)
      updateHistoryState()
    }

    updateStoredConfig(id, key, value)
    
    setRegistrations(prev => {
      const next = new Map(prev)
      const reg = next.get(id)
      if (reg) {
        const updated = {
          ...reg,
          currentConfig: { ...reg.currentConfig, [key]: value },
        }
        next.set(id, updated)
        reg.onUpdate(key, value)
      }
      return next
    })
  }, [registrations, updateHistoryState])

  const undo = useCallback(() => {
    const entry = undoHistory()
    if (entry) {
      updateStoredConfig(entry.id, entry.key, entry.oldValue)
      setRegistrations(prev => {
        const next = new Map(prev)
        const reg = next.get(entry.id)
        if (reg) {
          const updated = {
            ...reg,
            currentConfig: { ...reg.currentConfig, [entry.key]: entry.oldValue as TangentValue },
          }
          next.set(entry.id, updated)
          reg.onUpdate(entry.key, entry.oldValue as TangentValue)
        }
        return next
      })
      updateHistoryState()
    }
  }, [updateHistoryState])

  const redo = useCallback(() => {
    const entry = redoHistory()
    if (entry) {
      updateStoredConfig(entry.id, entry.key, entry.newValue)
      setRegistrations(prev => {
        const next = new Map(prev)
        const reg = next.get(entry.id)
        if (reg) {
          const updated = {
            ...reg,
            currentConfig: { ...reg.currentConfig, [entry.key]: entry.newValue as TangentValue },
          }
          next.set(entry.id, updated)
          reg.onUpdate(entry.key, entry.newValue as TangentValue)
        }
        return next
      })
      updateHistoryState()
    }
  }, [updateHistoryState])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 't' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault()
        setIsOpen(prev => !prev)
      }
      if (e.key === 's' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault()
        setShowSpacing(prev => !prev)
      }
      if (e.key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      if (e.key === 'z' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  const contextValue: TangentContextValue = {
    registrations,
    register,
    unregister,
    updateValue,
    isOpen,
    setIsOpen,
    showCode,
    setShowCode,
    showSpacing,
    setShowSpacing,
    viewport,
    setViewport,
    endpoint: endpoint!,
    historyState,
    undo,
    redo,
  }

  return (
    <TangentContext.Provider value={contextValue}>
      <ResponsivePreview enabled={viewport !== 'full'} viewport={viewport} onViewportChange={setViewport}>
        {children}
      </ResponsivePreview>
      {isOpen && registrations.size > 0 && <ControlPanel />}
      <SpacingOverlay enabled={showSpacing} />
    </TangentContext.Provider>
  )
}

export function useTangentContext(): TangentContextValue {
  const context = useContext(TangentContext)
  
  if (!isDev) {
    return prodContextValue
  }
  
  if (!context) {
    throw new Error('useTangentContext must be used within a TangentProvider')
  }
  return context
}
