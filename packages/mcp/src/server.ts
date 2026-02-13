/**
 * Tangent MCP Server
 *
 * Exposes Tangent's tuning state to AI coding agents via the Model Context Protocol.
 * Connects to the Vite dev server's HTTP API to read/write tuning data.
 *
 * Tools exposed:
 *   - tangent_list_registrations: List all registered components
 *   - tangent_get_values: Get current values for a component
 *   - tangent_update_value: Update a tuning value
 *   - tangent_save_all: Save all unsaved changes to source
 *   - tangent_watch_changes: Block until new tuning events, then return batch
 *   - tangent_suggest_value: Suggest a value change with reasoning
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

export interface TangentMcpOptions {
  /** URL of the Vite dev server (default: http://localhost:5173) */
  devServerUrl?: string
  /** Polling interval for watch in ms (default: 1000) */
  pollInterval?: number
}

export function createTangentMcpServer(options: TangentMcpOptions = {}) {
  const {
    devServerUrl = process.env.TANGENT_DEV_URL || 'http://localhost:5173',
    pollInterval = 1000,
  } = options

  const server = new McpServer(
    {
      name: 'tangent-mcp',
      version: '0.0.1',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  )

  // ─── Helper: fetch from dev server ──────────────────────

  async function tangentFetch(path: string, init?: RequestInit): Promise<any> {
    const url = `${devServerUrl}${path}`
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...init?.headers,
        },
      })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(`HTTP ${response.status}: ${text}`)
      }
      return response.json()
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(
          `Cannot connect to Tangent dev server at ${devServerUrl}. ` +
          `Make sure your Vite dev server is running with the tangent() plugin.`,
        )
      }
      throw error
    }
  }

  // ─── Tool: List Registrations ───────────────────────────

  server.tool(
    'tangent_list_registrations',
    'List all registered Tangent components with their tunable properties. ' +
    'Use this to discover what UI components are available for tuning.',
    {},
    async () => {
      const registrations = await tangentFetch('/__tangent/registrations')

      if (!registrations || registrations.length === 0) {
        return {
          content: [{
            type: 'text',
            text: 'No components are currently registered with Tangent. ' +
              'Make sure components use useTangent() and the page is loaded.',
          }],
        }
      }

      const summary = registrations.map((reg: any) => {
        const props = reg.properties?.map((p: any) =>
          `  - ${p.key}: ${JSON.stringify(p.value)} (${p.type})${p.sourceValue !== undefined && p.sourceValue !== p.value ? ` [modified from ${JSON.stringify(p.sourceValue)}]` : ''}`,
        ).join('\n') || '  (no properties)'

        return `### ${reg.id}\n**File:** \`${reg.filePath}\`\n**Unsaved:** ${reg.hasUnsavedChanges ? 'Yes' : 'No'}\n**Properties:**\n${props}`
      }).join('\n\n')

      return {
        content: [{
          type: 'text',
          text: `# Tangent Registrations (${registrations.length} components)\n\n${summary}`,
        }],
      }
    },
  )

  // ─── Tool: Get Values ───────────────────────────────────

  server.tool(
    'tangent_get_values',
    'Get the current tuning values for a specific component. ' +
    'Returns all properties with their current values, types, and source values.',
    {
      id: z.string().describe('The component ID (from useTangent)'),
    },
    async ({ id }) => {
      const reg = await tangentFetch(`/__tangent/registrations/${encodeURIComponent(id)}`)

      if (!reg) {
        return {
          content: [{
            type: 'text',
            text: `Component "${id}" not found. Use tangent_list_registrations to see available components.`,
          }],
          isError: true,
        }
      }

      const propsTable = reg.properties?.map((p: any) =>
        `| ${p.key} | \`${JSON.stringify(p.value)}\` | ${p.type} | ${p.sourceValue !== undefined && p.sourceValue !== p.value ? `\`${JSON.stringify(p.sourceValue)}\`` : '-'} |`,
      ).join('\n') || '(no properties)'

      return {
        content: [{
          type: 'text',
          text: [
            `# ${reg.id}`,
            `**File:** \`${reg.filePath}\``,
            `**Unsaved changes:** ${reg.hasUnsavedChanges ? 'Yes' : 'No'}`,
            '',
            '| Property | Current Value | Type | Source Value |',
            '|----------|---------------|------|-------------|',
            propsTable,
          ].join('\n'),
        }],
      }
    },
  )

  // ─── Tool: Update Value ─────────────────────────────────

  server.tool(
    'tangent_update_value',
    'Update a tuning value for a component. The change is applied live in the browser ' +
    'but NOT saved to the source file yet. Use tangent_save_all to persist changes. ' +
    'This is equivalent to a user dragging a slider in the Tangent control panel.',
    {
      id: z.string().describe('The component ID'),
      key: z.string().describe('The property key to update'),
      value: z.union([z.number(), z.string(), z.boolean()]).describe('The new value'),
    },
    async ({ id, key, value }) => {
      // First, get the registration to find filePath
      const reg = await tangentFetch(`/__tangent/registrations/${encodeURIComponent(id)}`)

      if (!reg) {
        return {
          content: [{
            type: 'text',
            text: `Component "${id}" not found.`,
          }],
          isError: true,
        }
      }

      // Post the event so the browser picks it up
      await tangentFetch('/__tangent/events', {
        method: 'POST',
        body: JSON.stringify({
          type: 'value.changed',
          payload: {
            id,
            filePath: reg.filePath,
            key,
            oldValue: reg.properties?.find((p: any) => p.key === key)?.value,
            newValue: value,
          },
        }),
      })

      return {
        content: [{
          type: 'text',
          text: `Updated ${id}.${key} = ${JSON.stringify(value)}. ` +
            `Change is live in the browser. Use tangent_save_all to persist to source.`,
        }],
      }
    },
  )

  // ─── Tool: Save All ─────────────────────────────────────

  server.tool(
    'tangent_save_all',
    'Save all unsaved tuning changes to source files. ' +
    'This writes the current values back into the source code using AST modification. ' +
    'The dev server will hot-reload after saving.',
    {},
    async () => {
      // Get all registrations to find unsaved changes
      const registrations = await tangentFetch('/__tangent/registrations')

      const unsaved = registrations.filter((r: any) => r.hasUnsavedChanges)

      if (unsaved.length === 0) {
        return {
          content: [{
            type: 'text',
            text: 'No unsaved changes to save.',
          }],
        }
      }

      let savedCount = 0
      const errors: string[] = []

      for (const reg of unsaved) {
        for (const prop of reg.properties || []) {
          if (prop.sourceValue !== undefined && prop.sourceValue !== prop.value) {
            try {
              await tangentFetch('/__tangent/update', {
                method: 'POST',
                body: JSON.stringify({
                  filePath: reg.filePath,
                  id: reg.id,
                  key: prop.key,
                  value: prop.value,
                }),
              })
              savedCount++
            } catch (error) {
              errors.push(`${reg.id}.${prop.key}: ${error instanceof Error ? error.message : String(error)}`)
            }
          }
        }
      }

      const result = [`Saved ${savedCount} change(s) across ${unsaved.length} component(s).`]
      if (errors.length > 0) {
        result.push(`\n**Errors:**\n${errors.map(e => `- ${e}`).join('\n')}`)
      }

      return {
        content: [{
          type: 'text',
          text: result.join('\n'),
        }],
      }
    },
  )

  // ─── Tool: Watch Changes ────────────────────────────────

  server.tool(
    'tangent_watch_changes',
    'Block until new tuning events appear, then return the batch. ' +
    'Use this in a loop for automatic feedback processing. ' +
    'The call will block for up to timeoutSeconds, collecting events.',
    {
      timeoutSeconds: z.number().default(30).describe('Max seconds to wait (default 30, max 120)'),
      sinceSequence: z.number().default(0).describe('Only return events after this sequence number'),
    },
    async ({ timeoutSeconds, sinceSequence }) => {
      const timeout = Math.min(timeoutSeconds, 120)
      const startTime = Date.now()
      let events: any[] = []

      // Poll for new events
      while (Date.now() - startTime < timeout * 1000) {
        try {
          const health = await tangentFetch('/__tangent/health')
          if (health.events > 0) {
            // Fetch recent events - we use the event stream approach
            const allEvents = await tangentFetch(
              `/__tangent/events?since=${sinceSequence}`,
            ).catch(() => [])

            if (Array.isArray(allEvents) && allEvents.length > 0) {
              events = allEvents
              break
            }
          }
        } catch {
          // Server not ready, wait and retry
        }

        await new Promise((resolve) => setTimeout(resolve, pollInterval))
      }

      if (events.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `No new events in ${timeout}s. The user may not have made any changes.`,
          }],
        }
      }

      const eventSummary = events.map((e: any) => {
        switch (e.type) {
          case 'value.changed':
            return `- **Changed** ${e.payload?.id}.${e.payload?.key}: ${JSON.stringify(e.payload?.oldValue)} -> ${JSON.stringify(e.payload?.newValue)}`
          case 'value.saved':
            return `- **Saved** ${e.payload?.id}.${e.payload?.key} = ${JSON.stringify(e.payload?.value)}`
          case 'value.reset':
            return `- **Reset** ${e.payload?.id} (keys: ${e.payload?.keys?.join(', ')})`
          case 'registration.added':
            return `- **Registered** ${e.payload?.id} (${e.payload?.properties?.length} properties)`
          case 'registration.removed':
            return `- **Unregistered** ${e.payload?.id}`
          case 'discovery.inspected':
            return `- **Inspected** \`${e.payload?.elementPath}\` (${e.payload?.suggestedProperties?.length} suggested properties)`
          default:
            return `- ${e.type}: ${JSON.stringify(e.payload)}`
        }
      }).join('\n')

      const lastSequence = events[events.length - 1]?.sequence || sinceSequence

      return {
        content: [{
          type: 'text',
          text: `# ${events.length} New Event(s)\n\n${eventSummary}\n\n_Last sequence: ${lastSequence}. Pass this to sinceSequence on next call._`,
        }],
      }
    },
  )

  // ─── Tool: Suggest Value ────────────────────────────────

  server.tool(
    'tangent_suggest_value',
    'Suggest a value change to the user with reasoning. ' +
    'The suggestion will appear in the Tangent control panel for the user to accept or reject. ' +
    'Use this when you have design insights or accessibility recommendations.',
    {
      targetId: z.string().describe('The component ID to suggest a change for'),
      key: z.string().describe('The property key'),
      suggestedValue: z.union([z.number(), z.string(), z.boolean()]).describe('The suggested value'),
      reason: z.string().describe('Why this value is recommended (e.g. "Improves contrast ratio to 4.5:1 for WCAG AA")'),
    },
    async ({ targetId, key, suggestedValue, reason }) => {
      try {
        await tangentFetch('/__tangent/suggestions', {
          method: 'POST',
          body: JSON.stringify({
            targetId,
            key,
            suggestedValue,
            reason,
          }),
        })

        return {
          content: [{
            type: 'text',
            text: `Suggestion submitted: Set ${targetId}.${key} to ${JSON.stringify(suggestedValue)}.\n` +
              `**Reason:** ${reason}\n\n` +
              `The user will see this suggestion in the Tangent panel.`,
          }],
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to submit suggestion: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        }
      }
    },
  )

  // ─── Tool: Get Health ───────────────────────────────────

  server.tool(
    'tangent_health',
    'Check if the Tangent dev server is running and accessible. ' +
    'Returns server status, version, and current registration count.',
    {},
    async () => {
      try {
        const health = await tangentFetch('/__tangent/health')
        return {
          content: [{
            type: 'text',
            text: `Tangent server is **running**.\n` +
              `- Version: ${health.version}\n` +
              `- Registered components: ${health.registrations}\n` +
              `- Events recorded: ${health.events}\n` +
              `- Dev server: ${devServerUrl}`,
          }],
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Tangent server is **not reachable** at ${devServerUrl}.\n` +
              `Error: ${error instanceof Error ? error.message : String(error)}\n\n` +
              `Make sure your Vite dev server is running with the tangent() plugin.`,
          }],
          isError: true,
        }
      }
    },
  )

  return server
}
