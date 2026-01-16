import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/api.ts', 'src/loader.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['next', 'webpack'],
})
