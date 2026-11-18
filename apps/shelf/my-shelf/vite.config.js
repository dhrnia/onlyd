import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { apply } from './api/library.js'

function apiDevPlugin() {
  let devLibrary = { items: [], genres: [], collections: [], operations: [] }

  return {
    name: 'api-dev-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/api/library') {
          res.setHeader('Content-Type', 'application/json')
          if (req.method === 'GET') {
            res.statusCode = 200
            res.end(JSON.stringify(devLibrary))
            return
          }
          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => {
              body += chunk
            })
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body)
                if (parsed.operation) {
                  devLibrary = apply(devLibrary, parsed.operation)
                }
                res.statusCode = 200
                res.end(JSON.stringify(devLibrary))
              } catch (e) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: e.message }))
              }
            })
            return
          }
        }
        next()
        })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    apiDevPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'My Shelf',
        short_name: 'MyShelf',
        description: 'Personal Book & Media Library Shelf',
        theme_color: '#f8f7f4',
        background_color: '#f8f7f4',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
})

