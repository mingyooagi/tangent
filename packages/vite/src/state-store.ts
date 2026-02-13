/**
 * Server-side state store for Tangent.
 * Tracks registrations, events, and agent suggestions.
 * Enables the MCP server and SSE streams.
 */

export interface StoredRegistration {
  id: string
  filePath: string
  properties: Array<{
    key: string
    value: unknown
    type: string
    sourceValue?: unknown
  }>
  hasUnsavedChanges: boolean
}

export interface StoredEvent {
  type: string
  timestamp: number
  sequence: number
  payload: Record<string, unknown>
}

export interface StoredSuggestion {
  id: string
  targetId: string
  key: string
  suggestedValue: unknown
  reason: string
  status: 'pending' | 'accepted' | 'rejected'
  timestamp: number
}

type EventListener = (event: StoredEvent) => void

const MAX_EVENTS = 500

export class TangentStateStore {
  private registrations: Map<string, StoredRegistration> = new Map()
  private events: StoredEvent[] = []
  private suggestions: StoredSuggestion[] = []
  private listeners: Set<EventListener> = new Set()
  private sequence = 0

  // ─── Registrations ────────────────────────────────────

  syncRegistrations(regs: StoredRegistration[]): void {
    this.registrations.clear()
    for (const reg of regs) {
      this.registrations.set(reg.id, reg)
    }
  }

  getRegistrations(): StoredRegistration[] {
    return Array.from(this.registrations.values())
  }

  getRegistration(id: string): StoredRegistration | undefined {
    return this.registrations.get(id)
  }

  // ─── Events ───────────────────────────────────────────

  recordEvent(partial: { type: string; payload: Record<string, unknown> }): StoredEvent {
    const event: StoredEvent = {
      type: partial.type,
      timestamp: Date.now(),
      sequence: ++this.sequence,
      payload: partial.payload,
    }

    this.events.push(event)
    if (this.events.length > MAX_EVENTS) {
      this.events = this.events.slice(-MAX_EVENTS)
    }

    // Notify SSE listeners
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch {
        // Remove broken listeners
        this.listeners.delete(listener)
      }
    }

    return event
  }

  getEvents(sinceSequence = 0): StoredEvent[] {
    return this.events.filter((e) => e.sequence > sinceSequence)
  }

  getEventCount(): number {
    return this.events.length
  }

  onEvent(listener: EventListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  // ─── Suggestions ──────────────────────────────────────

  addSuggestion(suggestion: Omit<StoredSuggestion, 'id' | 'timestamp' | 'status'>): StoredSuggestion {
    const stored: StoredSuggestion = {
      ...suggestion,
      id: `sug_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: 'pending',
      timestamp: Date.now(),
    }
    this.suggestions.push(stored)

    // Emit as event
    this.recordEvent({
      type: 'suggestion.created',
      payload: stored as unknown as Record<string, unknown>,
    })

    return stored
  }

  getSuggestions(status?: 'pending' | 'accepted' | 'rejected'): StoredSuggestion[] {
    if (status) {
      return this.suggestions.filter((s) => s.status === status)
    }
    return [...this.suggestions]
  }

  updateSuggestionStatus(id: string, status: 'accepted' | 'rejected'): boolean {
    const suggestion = this.suggestions.find((s) => s.id === id)
    if (suggestion) {
      suggestion.status = status
      this.recordEvent({
        type: `suggestion.${status}`,
        payload: suggestion as unknown as Record<string, unknown>,
      })
      return true
    }
    return false
  }
}
