import type { Plugin, ViteDevServer } from 'vite'
import { updateSourceFile } from './ast-modifier'
import { injectFilePath } from 'tangent-transform'

export interface TangentPluginOptions {
  enabled?: boolean
}

export interface UpdateRequest {
  filePath: string
  id: string
  key: string
  value: unknown
}

export function tangent(options: TangentPluginOptions = {}): Plugin {
  const { enabled = process.env.NODE_ENV !== 'production' } = options

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
        if (req.url === '/__tangent/update' && req.method === 'POST') {
          let body = ''

          req.on('data', (chunk) => {
            body += chunk.toString()
          })

          req.on('end', async () => {
            try {
              const { filePath, id, key, value } = JSON.parse(body) as UpdateRequest

              if (!filePath || !id || !key || value === undefined) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Missing required fields: filePath, id, key, value' }))
                return
              }

              await updateSourceFile(filePath, id, key, value)

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
          })

          return
        }

        if (req.url === '/__tangent/health' && req.method === 'GET') {
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ status: 'ok', version: '0.0.1' }))
          return
        }

        next()
      })
    },
  }
}

export default tangent
