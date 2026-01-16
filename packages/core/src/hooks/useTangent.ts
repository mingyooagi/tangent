import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { TangentConfig, TangentValue } from '../types'
import { useTangentContext } from '../context/TangentContext'
import { debounce } from '../utils/debounce'
import { getStoredConfig } from '../store'

interface UseTangentOptions {
  filePath?: string
}

export function useTangent<T extends TangentConfig>(
  id: string,
  defaultValues: T,
  options: UseTangentOptions = {}
): T {
  const { register, unregister, endpoint } = useTangentContext()
  
  const storedConfig = getStoredConfig(id)
  const [values, setValues] = useState<T>(() => (storedConfig as T) ?? defaultValues)
  
  const filePathRef = useRef(options.filePath)
  const idRef = useRef(id)
  const defaultValuesRef = useRef(defaultValues)

  const endpointRef = useRef(endpoint)
  endpointRef.current = endpoint

  const sendUpdate = useMemo(
    () =>
      debounce(async (key: string, value: TangentValue) => {
        const filePath = filePathRef.current
        if (!filePath) {
          console.warn('[tangent] No filePath provided, skipping server update')
          return
        }

        try {
          const response = await fetch(endpointRef.current, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath, id: idRef.current, key, value }),
          })

          if (!response.ok) {
            const error = await response.json()
            console.error('[tangent] Update failed:', error)
          }
        } catch (error) {
          console.error('[tangent] Network error:', error)
        }
      }, 500),
    []
  )

  const handleUpdate = useCallback((key: string, value: TangentValue) => {
    setValues(prev => ({ ...prev, [key]: value }))
    sendUpdate(key, value)
  }, [sendUpdate])

  useEffect(() => {
    queueMicrotask(() => {
      register({
        id,
        filePath: filePathRef.current || '',
        originalConfig: { ...defaultValuesRef.current },
        currentConfig: { ...defaultValuesRef.current },
        onUpdate: handleUpdate,
      })
    })

    return () => unregister(id)
  }, [id, register, unregister, handleUpdate])

  return values
}
