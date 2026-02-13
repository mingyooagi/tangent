#!/usr/bin/env node

/**
 * Tangent MCP Server CLI
 *
 * Usage:
 *   npx tangent-mcp                          # Start with defaults
 *   npx tangent-mcp --url http://localhost:3000  # Custom dev server URL
 *
 * Configuration for Claude Code:
 *   claude mcp add tangent -- npx tangent-mcp
 *
 * Configuration for Cursor (.cursor/mcp.json):
 *   {
 *     "mcpServers": {
 *       "tangent": {
 *         "command": "npx",
 *         "args": ["tangent-mcp"]
 *       }
 *     }
 *   }
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createTangentMcpServer } from './server.js'

const args = process.argv.slice(2)

// Parse CLI args
let devServerUrl = 'http://localhost:5173'

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--url' && args[i + 1]) {
    devServerUrl = args[i + 1]
    i++
  }
  if (args[i] === '--help' || args[i] === '-h') {
    console.error(`
tangent-mcp - MCP server for Tangent visual tuner

Usage:
  tangent-mcp [options]

Options:
  --url <url>    Vite dev server URL (default: http://localhost:5173)
  --help, -h     Show this help

Configuration:

  Claude Code:
    claude mcp add tangent -- npx tangent-mcp

  Cursor (.cursor/mcp.json):
    {
      "mcpServers": {
        "tangent": {
          "command": "npx",
          "args": ["tangent-mcp"]
        }
      }
    }

Tools:
  tangent_list_registrations  List all registered components
  tangent_get_values          Get values for a component
  tangent_update_value        Update a tuning value (live preview)
  tangent_save_all            Save all changes to source files
  tangent_watch_changes       Watch for tuning events
  tangent_suggest_value       Suggest a value change with reasoning
  tangent_health              Check server connectivity
`)
    process.exit(0)
  }
}

async function main() {
  const server = createTangentMcpServer({ devServerUrl })
  const transport = new StdioServerTransport()

  console.error(`[tangent-mcp] Starting MCP server...`)
  console.error(`[tangent-mcp] Dev server URL: ${devServerUrl}`)

  await server.connect(transport)

  console.error(`[tangent-mcp] Connected via stdio. Ready for AI agent requests.`)
}

main().catch((error) => {
  console.error('[tangent-mcp] Fatal error:', error)
  process.exit(1)
})
