import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'serverless-proxy-dev',
      configureServer(server) {
        server.middlewares.use('/api/proxy', async (req, res) => {
          try {
            const { default: handler } = await import('./api/proxy.js')
            const url = new URL(req.url, 'http://localhost')
            const query = Object.fromEntries(url.searchParams.entries())
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', async () => {
              let parsedBody = {}
              if (body) {
                try {
                  parsedBody = JSON.parse(body)
                } catch {
                  parsedBody = body
                }
              }
              const mockReq = {
                method: req.method,
                query,
                body: parsedBody,
                headers: req.headers,
              }
              const mockRes = {
                statusCode: 200,
                headers: {},
                setHeader(k, v) { this.headers[k] = v; res.setHeader(k, v) },
                status(code) { this.statusCode = code; res.statusCode = code; return this },
                json(data) {
                  this.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify(data))
                },
                end(data) { res.end(data) },
              }
              await handler(mockReq, mockRes)
            })
          } catch (err) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: err.message }))
          }
        })
      },
    },
  ],
})
