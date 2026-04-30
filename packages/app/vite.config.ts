import basicSsl from "@vitejs/plugin-basic-ssl"
import react from "@vitejs/plugin-react"
import appConfig from "config"
import { visualizer } from "rollup-plugin-visualizer"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"
import { vitePluginVersionMark } from "vite-plugin-version-mark"
import tailwindcss from "@tailwindcss/vite"
import { cp } from "node:fs/promises"
import { resolve } from "node:path"

// Copy sqlite3.wasm and OPFS proxy from worker-relay to build output
const copyWorkerRelayAssets = () => ({
  name: "copy-worker-relay-assets",
  writeBundle: async () => {
    const src = resolve(__dirname, "../worker-relay/dist/esm")
    const dest = resolve(__dirname, "build/assets")
    await cp(resolve(src, "sqlite3.wasm"), resolve(dest, "sqlite3.wasm")).catch(() => {})
    await cp(resolve(src, "sqlite3-opfs-async-proxy.js"), resolve(dest, "sqlite3-opfs-async-proxy.js")).catch(() => {})
  },
})

export default defineConfig({
  plugins: [
    tailwindcss(),
    //basicSsl(),
    react({
      babel: {
        configFile: true,
      },
    }),
    {
      name: "html-transform",
      transformIndexHtml(html: string) {
        const hostname = appConfig.get("hostname") as string
        const appTitle = appConfig.get("appTitle") as string
        const appName = appConfig.get("appName") as string
        const icon = appConfig.get("icon") as string

        return html
          .replace(/{{HOSTNAME}}/g, `https://${hostname}/`)
          .replace(/{{APP_TITLE}}/g, appTitle)
          .replace(/{{APP_NAME}}/g, appName)
          .replace(/{{OG_IMAGE}}/g, `https://${hostname}${icon}`)
      },
    },
    VitePWA({
      strategies: "injectManifest",
      injectRegister: "script",
      srcDir: "src",
      filename: "service-worker.ts",
      registerType: "autoUpdate",
      devOptions: {
        enabled: false,
        type: "module",
      },
    }),
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
    copyWorkerRelayAssets(),
  ],
  assetsInclude: ["**/*.md", "**/*.wasm"],
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
    proxy: {},
    watch: {
      usePolling: true,
    },
  },
  optimizeDeps: {
    exclude: ["@sqlite.org/sqlite-wasm"],
  },
  build: {
    outDir: "build",
    commonjsOptions: { transformMixedEsModules: true },
    sourcemap: true,
  },
  clearScreen: false,
  publicDir: appConfig.get("publicDir"),
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  define: {
    CONFIG: JSON.stringify(appConfig),
    global: {}, // needed for custom-event lib
  },
  worker: {
    format: "es",
  },
})
