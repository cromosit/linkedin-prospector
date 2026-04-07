import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/auth': {
        target: 'http://localhost:3000',
        bypass: (req) => {
          if (req.url.startsWith('/auth/sucesso')) return req.url
        }
      }
    }
  }
})
