import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: '0.0.0.0',
    proxy: {
      '/api': 'http://localhost:3001',
      '/auth': {
        target: 'http://localhost:3001',
        bypass: (req) => {
          if (req.url.startsWith('/auth/sucesso')) return req.url
        }
      }
    }
  }
})
