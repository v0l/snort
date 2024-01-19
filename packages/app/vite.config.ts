import react from "@vitejs/plugin-react";
import appConfig from "config";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { vitePluginVersionMark } from "vite-plugin-version-mark";

export default defineConfig({
  plugins: [
    react({
      jsxImportSource: "@welldone-software/why-did-you-render",
    }),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "service-worker.ts",
      devOptions: {
        enabled: true,
        type: "module",
      },
      workbox: {
        globPatterns: ["**/*.{js,html,wasm,woff,woff2,ttf,svg,png,jpg,jpeg,webp,ico,json}"],
        sourcemap: true,
      },
    }),
    visualizer({
      open: true,
      gzipSize: true,
      filename: "build/stats.html",
    }),
    vitePluginVersionMark({
      name: "snort",
      ifGitSHA: true,
      command: "git describe --always --tags",
      ifMeta: false,
    }),
  ],
  assetsInclude: ["**/*.md", "**/*.wasm"],
  build: {
    outDir: "build",
    commonjsOptions: { transformMixedEsModules: true },
  },
  clearScreen: false,
  publicDir: appConfig.get("publicDir"),
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  optimizeDeps: {
    exclude: ["@sqlite.org/sqlite-wasm"],
  },
  define: {
    CONFIG: JSON.stringify(appConfig),
    global: {}, // needed for custom-event lib
    SINGLE_RELAY: JSON.stringify(process.env.SINGLE_RELAY),
  },
  test: {
    globals: true,
    environment: "jsdom",
  },
  worker: {
    format: "es",
  },
});
