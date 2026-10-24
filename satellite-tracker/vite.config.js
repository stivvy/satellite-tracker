import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: ['landfall-hassle-platter.ngrok-free.dev', 'all'],
    proxy: {
      '/celestrak': {
        target: 'https://celestrak.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/celestrak/, '/NORAD/elements'),
      },
      '/gibs': {
        target: 'https://gibs.earthdata.nasa.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gibs/, ''),
      },
    },
  },
})