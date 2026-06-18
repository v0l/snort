/**
 * Vite SSR dev server
 *
 * Uses Vite in middleware mode so HMR / transforms work during development.
 * On each request it:
 *  1. Loads the server entry via Vite's SSR module loader (always fresh)
 *  2. Reads index.html and injects the SSR-rendered app markup + head tags
 *  3. Swaps the SPA entry script for the SSR client entry for hydration
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import express from "express"
import { createServer as createViteServer } from "vite"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const resolve = (p: string) => path.resolve(__dirname, p)

const PORT = parseInt(process.env.PORT ?? "3000", 10)

async function main() {
  const app = express()

  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "custom",
  })

  // Use Vite's connect-compatible middleware for hot reload / transforms
  app.use(vite.middlewares)

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() })
  })

  app.use(async (req, res, next) => {
    const url = req.originalUrl

    try {
      // Read index.html
      let template = fs.readFileSync(resolve("../index.html"), "utf-8")

      // Apply Vite HTML transforms (injects HMR client etc.)
      template = await vite.transformIndexHtml(url, template)

      // Load the server entry — Vite SSR ensures it's always up-to-date
      const { render } = await vite.ssrLoadModule("/src/entry/entry-server.tsx")

      const { html: appHtml, head, title: ssrTitle, status, redirect, helmetState, hydrationData } = await render(url)

      if (redirect) {
        res.redirect(status ?? 302, redirect)
        return
      }

      // Inject SSR content into the root div
      // Inject helmet head tags before the closing </head>
      // Inject helmet state as window.__HELMET_STATE__ for client hydration
      // Inject hydration data as window.__HYDRATION_DATA__ for SPA NostrSystem
      // Swap the SPA entry script for the SSR client hydration entry
      let html = template
        .replace(`<!-- ssr-outlet -->`, appHtml)
        .replace(
          `<script type="module" src="/src/index.tsx"></script>`,
          `<script type="module" src="/src/entry/entry-client.tsx"></script>`,
        )

      // Replace the template <title> with the SSR-specific title for SEO
      if (ssrTitle) {
        html = html.replace(/<title>.*?<\/title>/, `<title>${ssrTitle}</title>`)
      }

      if (head) {
        html = html.replace("</head>", `${head}\n</head>`)
      }

      const scripts: string[] = []
      if (helmetState) {
        scripts.push(`<script>window.__HELMET_STATE__=${JSON.stringify(helmetState)}</script>`)
      }
      if (hydrationData && Object.keys(hydrationData).length > 0) {
        scripts.push(`<script>window.__HYDRATION_DATA__=${JSON.stringify(hydrationData)}</script>`)
      }
      if (scripts.length > 0) {
        html = html.replace("</head>", `${scripts.join("\n")}\n</head>`)
      }

      res.status(status ?? 200).set({ "Content-Type": "text/html" }).end(html)
    } catch (e: any) {
      // If an error occurs, let Vite fix the stack trace so it maps back to
      // the actual source file instead of the transformed module.
      vite.ssrFixStacktrace(e)
      console.error(e)
      res.status(500).end(e.stack ?? e.message)
    }
  })

  app.listen(PORT, () => {
    console.log(`SSR dev server running at http://localhost:${PORT}`)
  })
}

main()
