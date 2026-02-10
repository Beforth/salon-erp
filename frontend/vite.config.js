import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://ksagar-aetosvision-ai.encryptedbar.com',
        changeOrigin: true,
      },
    },
    allowedHosts: [
      '5e99f3949459.ngrok-free.app',
      'ksagar-aetosvision-ai.encryptedbar.com',
      'localhost',
    ]
  },
})
