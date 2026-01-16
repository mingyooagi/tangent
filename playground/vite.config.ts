import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tangent from 'vite-plugin-tangent'

export default defineConfig({
  plugins: [react(), tangent()],
})
