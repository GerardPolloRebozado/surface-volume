import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@contract': fileURLToPath(new URL('../contract', import.meta.url)),
      '@backend': fileURLToPath(new URL('../backend-nestjs/src', import.meta.url)),
    },
  },
})
