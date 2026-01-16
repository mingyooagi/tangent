import type { NextConfig } from 'next'
import type { Configuration, RuleSetRule } from 'webpack'
import { injectFilePath } from 'tangent-transform'
import path from 'path'

export interface TangentPluginOptions {
  enabled?: boolean
}

export function withTangent(options: TangentPluginOptions = {}) {
  const { enabled = process.env.NODE_ENV !== 'production' } = options

  return (nextConfig: NextConfig = {}): NextConfig => {
    if (!enabled) {
      return nextConfig
    }

    return {
      ...nextConfig,
      webpack(config: Configuration, context) {
        const { isServer } = context

        if (!isServer) {
          config.module = config.module || {}
          config.module.rules = config.module.rules || []

          const loaderPath = path.resolve(__dirname, 'loader.cjs')

          const tangentLoader: RuleSetRule = {
            test: /\.[jt]sx?$/,
            exclude: /node_modules/,
            enforce: 'pre',
            use: [
              {
                loader: loaderPath,
              },
            ],
          }

          config.module.rules.push(tangentLoader)
        }

        if (typeof nextConfig.webpack === 'function') {
          return nextConfig.webpack(config, context)
        }

        return config
      },
    }
  }
}

export { injectFilePath }
export default withTangent
