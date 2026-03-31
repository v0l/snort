import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import express from "express"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProduction = process.env.NODE_ENV === "production"
const root = path.resolve(__dirname, "..")

let viteDevServer: any

async function createServer() {
  const app = express()

  // Vite middleware in development
  if (!isProduction) {
    const vite = await import("vite")
    viteDevServer = await vite.createServer({
      root,
      server: { middlewareMode: true },
    })
    app.use(viteDevServer.middlewares)
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(root, "build/client")))
  }

  // Handle all requests - SSR rendering
  app.use("*", async (req, res) => {
    const url = req.originalUrl

    try {
      let template: string
      let render: (url: string) => Promise<string>

      if (!isProduction) {
        // Development mode - read and transform template
        template = fs.readFileSync(path.resolve(root, "index.html"), "utf-8")
        template = await viteDevServer.transformIndexHtml(url, template)
        const serverModule = await viteDevServer.ssrLoadModule("/src/entry-server.tsx")
        render = serverModule.renderPage
      } else {
        // Production mode
        template = fs.readFileSync(path.resolve(root, "build/client/index.html"), "utf-8")
        const { renderPage } = await import("./server-entry.js")
        render = renderPage
      }

      // Render the app to HTML
      const appHtml = await render(url)

      // Inject rendered HTML into template
      const html = template.replace("<!--app-html-->", appHtml)

      res.status(200).set({ "Content-Type": "text/html" }).end(html)
    } catch (e: unknown) {
      if (!isProduction) {
        viteDevServer?.ssrFixStacktrace(e as Error)
      }
      console.error("SSR Error:", e)
      res.status(500).end("Internal Server Error")
    }
  })

  const port = process.env.PORT || 3000
  app.listen(port, () => {
    console.log(`SSR Server started at http://localhost:${port}`)
    console.log(`Environment: ${isProduction ? "Production" : "Development"}`)
  })
}

createServer()
