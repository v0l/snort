/**
 * Production SSR server using Bun.serve
 *
 * Serves pre-built client assets from build/client/ and renders pages
 * on the server using the pre-built SSR bundle from build/server/.
 *
 * Build first:
 *   bun run build:ssr
 *
 * Then run:
 *   bun run serve:ssr
 *   PORT=8080 bun run serve:ssr
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import appConfig from "config"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const resolve = (p: string) => path.resolve(__dirname, p)

const PORT = parseInt(process.env.PORT ?? "3000", 10)

// Paths to built artifacts
const clientDist = resolve("../build/client")
const serverDist = resolve("../build/server")
const indexHtmlPath = resolve("../build/client/index.html")

// MIME types for static assets
const mimeTypes: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".wasm": "application/wasm",
  ".map": "application/json",
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  return mimeTypes[ext] ?? "application/octet-stream"
}

// Template caching
let templateCache: string | null = null
function getTemplate(): string {
  if (!templateCache) {
    templateCache = fs.readFileSync(indexHtmlPath, "utf-8")
  }
  return templateCache
}

// SSR module caching — loaded once, reused across requests
let ssrModule: {
  render: (url: string) => Promise<{
    html: string
    head: string
    status: number
    redirect?: string
    helmetState: any
  }>
} | null = null
async function getSSRModule() {
  if (!ssrModule) {
    ssrModule = await import(resolve(`${serverDist}/entry-server.js`))
  }
  return ssrModule
}

const hostname = appConfig.get("hostname") as string
const appTitle = appConfig.get("appTitle") as string
const appName = appConfig.get("appName") as string
const icon = appConfig.get("icon") as string

function applyTemplateTransforms(html: string): string {
  return html
    .replace(/{{HOSTNAME}}/g, `https://${hostname}/`)
    .replace(/{{APP_TITLE}}/g, appTitle)
    .replace(/{{APP_NAME}}/g, appName)
    .replace(/{{OG_IMAGE}}/g, `https://${hostname}${icon}`)
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)

    // Health check endpoint
    if (url.pathname === "/health") {
      return Response.json({ status: "ok", timestamp: new Date().toISOString() })
    }

    const pathname = url.pathname

    // --- Static assets ---
    // Try to serve from build/client first
    if (pathname !== "/" && !pathname.includes("..")) {
      const filePath = path.join(clientDist, pathname)
      try {
        const stat = fs.statSync(filePath)
        if (stat.isFile()) {
          const body = fs.readFileSync(filePath)
          return new Response(body, {
            headers: { "Content-Type": getMimeType(filePath), "Cache-Control": "public, max-age=31536000, immutable" },
          })
        }
      } catch {
        // file doesn't exist, fall through to SSR
      }
    }

    // --- SSR page rendering ---
    try {
      const template = applyTemplateTransforms(getTemplate())
      const { render } = await getSSRModule()
      const { html: appHtml, head, title: ssrTitle, status, redirect, helmetState, hydrationData } = await render(pathname)

      if (redirect) {
        return new Response(null, {
          status: status ?? 302,
          headers: { Location: redirect },
        })
      }

      let html = template.replace(`<!-- ssr-outlet -->`, appHtml)

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

      return new Response(html, {
        status: status ?? 200,
        headers: {
          "Content-Type": "text/html",
          "Cache-Control": "no-cache",
        },
      })
    } catch (e: any) {
      console.error("SSR render error:", e)
      return new Response(`Server Error: ${e.message}`, { status: 500 })
    }
  },
})

console.log(`SSR prod server running at http://localhost:${server.port}`)
