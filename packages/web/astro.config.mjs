import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import node from '@astrojs/node'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  image: {
    service: { entrypoint: 'astro/assets/services/noop' },
  },
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname,
        '@contract': new URL('../contract', import.meta.url).pathname,
        '@backend': new URL('../backend-nestjs/src', import.meta.url).pathname,
        '@api-client': new URL('../api-client-ts', import.meta.url).pathname,
      },
    },
  },
})
