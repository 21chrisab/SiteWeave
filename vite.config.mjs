import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // In CI/CD, process.env will have the values set by GitHub Actions
  const fileEnv = loadEnv(mode, process.cwd(), '')
  const env = {
    ...fileEnv,
    // Override with process.env if available (for CI/CD)
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || fileEnv.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || fileEnv.VITE_SUPABASE_ANON_KEY,
    VITE_GOOGLE_CLIENT_ID: process.env.VITE_GOOGLE_CLIENT_ID || fileEnv.VITE_GOOGLE_CLIENT_ID,
    VITE_MICROSOFT_CLIENT_ID: process.env.VITE_MICROSOFT_CLIENT_ID || fileEnv.VITE_MICROSOFT_CLIENT_ID,
    VITE_DROPBOX_APP_KEY: process.env.VITE_DROPBOX_APP_KEY || fileEnv.VITE_DROPBOX_APP_KEY,
  }
  
  const isDev = mode === 'development'
  
  return {
    plugins: [
      react(),
      electron([
        {
          // Main-Process entry file of the Electron App.
          entry: 'electron/main.cjs',
          onstart(options) {
            // Notify the Renderer-Process to reload the page when the Preload-Scripts build is complete, 
            // instead of restarting the entire Electron App.
            options.reload()
          },
          vite: {
            build: {
              rollupOptions: {
                output: {
                  entryFileNames: 'main.cjs'
                }
              }
            }
          }
        },
        {
          entry: 'electron/preload.js',
          onstart(options) {
            // Notify the Renderer-Process to reload the page when the Preload-Scripts build is complete, 
            // instead of restarting the entire Electron App.
            options.reload()
          },
        },
      ]),
      renderer()
    ],
    base: './', // Required for Electron file:// protocol
    define: {
      // Explicitly expose environment variables to the client
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(env.VITE_GOOGLE_CLIENT_ID),
      'import.meta.env.VITE_MICROSOFT_CLIENT_ID': JSON.stringify(env.VITE_MICROSOFT_CLIENT_ID),
      'import.meta.env.VITE_DROPBOX_APP_KEY': JSON.stringify(env.VITE_DROPBOX_APP_KEY),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    server: {
      port: 5173,
    }
  }
})

