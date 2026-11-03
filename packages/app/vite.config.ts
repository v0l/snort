import react from "@vitejs/plugin-react"
import appConfig from "config"
import formatjs from "@formatjs/unplugin/vite"
import { visualizer } from "rollup-plugin-visualizer"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"
import { vitePluginVersionMark } from "vite-plugin-version-mark"
import tailwindcss from "@tailwindcss/vite"
import { cp } from "node:fs/promises"
import { resolve } from "node:path"

// Copy sqlite3.wasm and OPFS proxy from worker-relay to build output
const copyWorkerRelayAssets = (destDir: string) => ({
  name: "copy-worker-relay-assets",
  writeBundle: async () => {
    const src = resolve(import.meta.dirname, "../worker-relay/dist/esm")
    const dest = resolve(import.meta.dirname, destDir)
    await cp(resolve(src, "sqlite3.wasm"), resolve(dest, "sqlite3.wasm")).catch(() => {})
    await cp(resolve(src, "sqlite3-opfs-async-proxy.js"), resolve(dest, "sqlite3-opfs-async-proxy.js")).catch(() => {})
  },
})

const hostname = appConfig.get("hostname") as string
const appTitle = appConfig.get("appTitle") as string
const appName = appConfig.get("appName") as string
const icon = appConfig.get("icon") as string

const htmlTransform = {
  name: "html-transform",
  transformIndexHtml(html: string) {
    return html
      .replace(/{{HOSTNAME}}/g, `https://${hostname}/`)
      .replace(/{{APP_TITLE}}/g, appTitle)
      .replace(/{{APP_NAME}}/g, appName)
      .replace(/{{OG_IMAGE}}/g, `https://${hostname}${icon}`)
  },
}

const intl = () =>
  formatjs({
    idInterpolationPattern: "[sha512:contenthash:base64:6]",
    ast: true,
  })

const pwa = () =>
  VitePWA({
    strategies: "injectManifest",
    injectRegister: "script",
    srcDir: "src",
    filename: "service-worker.ts",
    registerType: "autoUpdate",
    injectManifest: {
      globIgnores: ["**/node_modules/**/*", "stats.html", "**/agent-*.js", "**/AgentPage-*.js", "**/livekit-*.js"],
    },
    devOptions: {
      enabled: false,
      type: "module",
    },
  })

// Shared settings common to both client and server builds
const shared = {
  assetsInclude: ["**/*.md", "**/*.wasm"] as string[],
  optimizeDeps: {
    exclude: ["@sqlite.org/sqlite-wasm"],
  },
  clearScreen: false,
  publicDir: appConfig.get<string>("publicDir"),
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  define: {
    CONFIG: JSON.stringify(appConfig),
    global: {},
  },
  worker: {
    format: "es" as const,
  },
}

// https://vitejs.dev/config/
export default defineConfig(() => {
  // Default SPA client build (bun run build)
  return {
    ...shared,
    plugins: [
      tailwindcss(),
      //basicSsl(),
      intl(),
      react(),
      htmlTransform,
      pwa(),
      visualizer({
        open: false,
        gzipSize: true,
        filename: "build/stats.html",
      }),
      vitePluginVersionMark({
        name: "snort",
        ifGitSHA: true,
        command: "git describe --always --tags",
        ifMeta: true,
        ifLog: false,
        ifGlobal: false,
      }),
      copyWorkerRelayAssets("build/assets"),
    ],
    build: {
      outDir: "build",
      sourcemap: true,
      rolldownOptions: {
        input: resolve(import.meta.dirname, "index.html"),
      },
    },
  }
})
