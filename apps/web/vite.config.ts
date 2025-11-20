import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@siteweave/core-logic': path.resolve(__dirname, '../../packages/core-logic/src/index.js')
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    commonjsOptions: {
      transformMixedEsModules: true
    }
  },
  // Vite automatically loads .env files from the project root
  // Environment variables prefixed with VITE_ are automatically exposed
})


