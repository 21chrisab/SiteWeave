import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/',
  plugins: [react()],
  // Vite automatically loads .env files from the project root
  // Environment variables prefixed with VITE_ are automatically exposed
})


