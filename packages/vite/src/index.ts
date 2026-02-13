import type { Plugin, ViteDevServer } from 'vite'
import { updateSourceFile } from './ast-modifier'
import { injectFilePath } from 'tangent-transform'
import { TangentStateStore } from './state-store'

export interface TangentPluginOptions {
  enabled?: boolean
  /** Port for the MCP bridge HTTP server (default: same as Vite via middleware) */
  mcpPort?: number
}

export interface UpdateRequest {
  filePath: string
  id: string
  key: string
  value: unknown
}

export function tangent(options: TangentPluginOptions = {}): Plugin {
  const { enabled = process.env.NODE_ENV !== 'production' } = options
  const store = new TangentStateStore()

  return {
    name: 'vite-plugin-tangent',
    apply: 'serve',

    transform(code, id) {
      if (!enabled) return null
      if (!id.match(/\.[jt]sx?$/)) return null
      if (id.includes('node_modules')) return null
      if (!code.includes('useTangent')) return null

      const result = injectFilePath(code, id)
      if (result) {
        return { code: result, map: null }
      }
      return null
    },

    configureServer(server: ViteDevServer) {
      if (!enabled) return

      server.middlewares.use(async (req, res, next) => {
        // ── Existing: Update source file ──────────────────────
        if (req.url === '/__tangent/update' && req.method === 'POST') {
          const body = await readBody(req)
          try {
            const { filePath, id, key, value } = JSON.parse(body) as UpdateRequest

            if (!filePath || !id || !key || value === undefined) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Missing required fields: filePath, id, key, value' }))
              return
            }

            await updateSourceFile(filePath, id, key, value)

            // Track save event in state store
            store.recordEvent({
              type: 'value.saved',
              payload: { id, filePath, key, value },
            })

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true }))
          } catch (error) {
            console.error('[tangent] Error updating file:', error)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error'
            }))
          }
          return
        }

        // ── New: Sync registrations from browser ──────────────
        if (req.url === '/__tangent/sync' && req.method === 'POST') {
          const body = await readBody(req)
          try {
            const data = JSON.parse(body)
            store.syncRegistrations(data.registrations || [])
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true }))
          } catch (error) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Invalid sync data' }))
          }
          return
        }

        // ── New: Get all registrations (for MCP) ──────────────
        if (req.url === '/__tangent/registrations' && req.method === 'GET') {
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.end(JSON.stringify(store.getRegistrations()))
          return
        }

        // ── New: Get single registration ──────────────────────
        if (req.url?.startsWith('/__tangent/registrations/') && req.method === 'GET') {
          const id = decodeURIComponent(req.url.replace('/__tangent/registrations/', ''))
          const reg = store.getRegistration(id)
          if (reg) {
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(reg))
          } else {
            res.statusCode = 404
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: `Registration '${id}' not found` }))
          }
          return
        }

        // ── New: SSE event stream (for MCP real-time) ─────────
        if (req.url === '/__tangent/events' && req.method === 'GET') {
          res.statusCode = 200
          res.setHeader('Content-Type', 'text/event-stream')
          res.setHeader('Cache-Control', 'no-cache')
          res.setHeader('Connection', 'keep-alive')
          res.setHeader('Access-Control-Allow-Origin', '*')

          // Send initial connected event
          res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`)

          const unsubscribe = store.onEvent((event) => {
            res.write(`id: ${event.sequence}\n`)
            res.write(`event: ${event.type}\n`)
            res.write(`data: ${JSON.stringify(event)}\n\n`)
          })

          req.on('close', () => {
            unsubscribe()
          })
          return
        }

        // ── New: Post event from browser ──────────────────────
        if (req.url === '/__tangent/events' && req.method === 'POST') {
          const body = await readBody(req)
          try {
            const event = JSON.parse(body)
            store.recordEvent(event)
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true }))
          } catch (error) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Invalid event data' }))
          }
          return
        }

        // ── New: Agent suggestions ────────────────────────────
        if (req.url === '/__tangent/suggestions' && req.method === 'POST') {
          const body = await readBody(req)
          try {
            const suggestion = JSON.parse(body)
            store.addSuggestion(suggestion)
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true }))
          } catch (error) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Invalid suggestion data' }))
          }
          return
        }

        if (req.url === '/__tangent/suggestions' && req.method === 'GET') {
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(store.getSuggestions()))
          return
        }

        // ── Existing: Health check ────────────────────────────
        if (req.url === '/__tangent/health' && req.method === 'GET') {
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            status: 'ok',
            version: '0.0.2',
            registrations: store.getRegistrations().length,
            events: store.getEventCount(),
          }))
          return
        }

        next()
      })
    },
  }
}

/** Helper to read request body */
function readBody(req: import('http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => { body += chunk.toString() })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

export default tangent
