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
const copyWorkerRelayAssets = (destDir: string) => ({
  name: "copy-worker-relay-assets",
  writeBundle: async () => {
    const src = resolve(__dirname, "../worker-relay/dist/esm")
    const dest = resolve(__dirname, destDir)
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

// Plugin that swaps the SPA entry script for the SSR client entry in index.html
const ssrClientEntry = () => ({
  name: "ssr-client-entry",
  transformIndexHtml(html: string) {
    return html.replace(
      `<script type="module" src="/src/index.tsx"></script>`,
      `<script type="module" src="/src/entry/entry-client.tsx"></script>`,
    )
  },
})

// Shared settings common to both client and server builds
const shared = {
  assetsInclude: ["**/*.md", "**/*.wasm"] as string[],
  optimizeDeps: {
    exclude: ["@sqlite.org/sqlite-wasm"],
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
    global: {},
  },
  worker: {
    format: "es" as const,
  },
}

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const isSSR = process.env.SSR === "true"
  const isSSRClient = process.env.SSR_CLIENT === "true"

  // SSR server build: produces the server-side bundle
  if (isSSR) {
    return {
      ...shared,
      plugins: [react({ babel: { configFile: true } })],
      build: {
        outDir: "build/server",
        commonjsOptions: { transformMixedEsModules: true },
        sourcemap: true,
        ssr: true,
        rollupOptions: {
          input: resolve(__dirname, "src/entry/entry-server.tsx"),
          output: {
            format: "esm",
            entryFileNames: "entry-server.js",
          },
        },
        copyPublicDir: false,
      },
    }
  }

  // SSR client build: same as SPA but uses entry-client.tsx for hydration
  if (isSSRClient) {
    return {
      ...shared,
      plugins: [
        tailwindcss(),
        react({ babel: { configFile: true } }),
        htmlTransform,
        ssrClientEntry(),
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
        copyWorkerRelayAssets("build/client/assets"),
      ],
      build: {
        outDir: "build/client",
        commonjsOptions: { transformMixedEsModules: true },
        sourcemap: true,
        rollupOptions: {
          input: resolve(__dirname, "index.html"),
        },
      },
    }
  }

  // Default SPA client build (bun run build)
  return {
    ...shared,
    plugins: [
      tailwindcss(),
      //basicSsl(),
      react({
        babel: {
          configFile: true,
        },
      }),
      htmlTransform,
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
      copyWorkerRelayAssets("build/assets"),
    ],
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
    build: {
      outDir: "build",
      commonjsOptions: { transformMixedEsModules: true },
      sourcemap: true,
      rollupOptions: {
        input: resolve(__dirname, "index.html"),
      },
    },
  }
})
