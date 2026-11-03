import react from "@vitejs/plugin-react"
import formatjs from "@formatjs/unplugin/vite"
import appConfig from "config"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [formatjs({ idInterpolationPattern: "[sha512:contenthash:base64:6]", ast: true }), react()],
  resolve: {
    alias: [
      { find: "react-dom/server", replacement: "react-dom/server.browser" },
      { find: "@", replacement: "/src" },
    ],
  },
  assetsInclude: ["**/*.md", "**/*.wasm"],
  define: {
    CONFIG: JSON.stringify(appConfig),
    global: "globalThis",
    "import.meta.env.DEV": "false",
  },
  ssr: { noExternal: true, target: "webworker", resolve: { conditions: ["worker", "module", "browser"] } },
  build: {
    ssr: "src/ssr/entry-server.tsx",
    outDir: "build/ssr",
    emptyOutDir: true,
    minify: process.env.SSR_DEBUG !== "1",
    sourcemap: false,
    copyPublicDir: false,
    rollupOptions: {
      output: { format: "iife", name: "SnortSsr", inlineDynamicImports: true, entryFileNames: "render.js" },
    },
  },
})
