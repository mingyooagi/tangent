import type { TangentValue } from './types'

interface HistoryEntry {
  id: string
  key: string
  oldValue: TangentValue
  newValue: TangentValue
  timestamp: number
}

const history: HistoryEntry[] = []
let historyIndex = -1
const MAX_HISTORY = 100

export function pushHistory(id: string, key: string, oldValue: TangentValue, newValue: TangentValue): void {
  // Remove any future entries if we're not at the end
  if (historyIndex < history.length - 1) {
    history.splice(historyIndex + 1)
  }

  history.push({
    id,
    key,
    oldValue,
    newValue,
    timestamp: Date.now(),
  })

  // Limit history size
  if (history.length > MAX_HISTORY) {
    history.shift()
  } else {
    historyIndex++
  }
}

export function canUndo(): boolean {
  return historyIndex >= 0
}

export function canRedo(): boolean {
  return historyIndex < history.length - 1
}

export function undo(): HistoryEntry | null {
  if (!canUndo()) return null
  const entry = history[historyIndex]
  historyIndex--
  return entry
}

export function redo(): HistoryEntry | null {
  if (!canRedo()) return null
  historyIndex++
  return history[historyIndex]
}

export function getHistoryState(): { canUndo: boolean; canRedo: boolean; count: number } {
  return {
    canUndo: canUndo(),
    canRedo: canRedo(),
    count: history.length,
  }
}

export function clearHistory(): void {
  history.length = 0
  historyIndex = -1
}
