import "../index.css"
import "@/assets/fonts/inter.css"

import { unixNow, unixNowMs } from "@snort/shared"
import { EventBuilder } from "@snort/system"
import { SnortContext } from "@snort/system-react"
import { StrictMode } from "react"
import * as ReactDOM from "react-dom/client"
import { HelmetProvider } from "react-helmet-async"
import { createBrowserRouter, RouterProvider } from "react-router-dom"

import { initRelayWorker, ProfilesCache, preload, Relay } from "@/Cache"
import { IntlProvider } from "@/Components/IntlProvider/IntlProvider"
import { addCachedMetadataToFuzzySearch } from "@/Db/FuzzySearch"
import { System } from "@/system"
import { storeRefCode, unwrap } from "@/Utils"
import { hasWasm, WasmPath, wasmInit } from "@/Utils/wasm"
import { setupWebLNWalletConfig, Wallets } from "@/Wallet"
import { SpotlightContextWrapper } from "@/Components/Spotlight/context"
import { Day } from "@/Utils/Const"
import { LoginStore } from "@/Utils/Login"

import { routes } from "./routes"

async function initSite() {
  EventBuilder.ClientTag = [
    "client",
    CONFIG.appNameCapitalized,
    "31990:84de35e2584d2b144aae823c9ed0b0f3deda09648530b93d1a2a146d1dea9864:app-profile",
  ]
  storeRefCode()
  if (hasWasm) {
    await wasmInit(WasmPath)
    await initRelayWorker()
  }

  setupWebLNWalletConfig(Wallets)

  const login = LoginStore.snapshot()
  preload(login.state.follows).then(async () => {
    queueMicrotask(async () => {
      const start = unixNowMs()
      await System.PreloadSocialGraph(login.state.follows, login.publicKey)
      console.debug(
        `Social graph loaded in ${(unixNowMs() - start).toFixed(3)}ms`,
        System.config.socialGraphInstance.size(),
      )
    })

    for (const ev of ProfilesCache.snapshot()) {
      try {
        addCachedMetadataToFuzzySearch(ev)
      } catch (e) {
        console.error("Failed to handle metadata event from sql db", e)
      }
    }
  })

  // cleanup
  Relay?.delete(["REQ", "cleanup", { kinds: [1, 6, 7, 9735], until: unixNow() - Day * 30 }])

  return null
}

let didInit = false

// Wrap routes with initSite loader
const routesWithInit = routes.map(route => ({
  ...route,
  loader: async () => {
    if (!didInit) {
      didInit = true
      return await initSite()
    }
    return null
  },
}))

const router = createBrowserRouter(routesWithInit)

// Hydrate helmet state from SSR-rendered page
const helmetContext = (window as any).__HELMET_STATE__
  ? { helmet: (window as any).__HELMET_STATE__ }
  : undefined

// Hydrate NostrSystem queries from SSR data — avoids redundant relay fetches
const hydrationData = (window as any).__HYDRATION_DATA__
if (hydrationData) {
  for (const [id, events] of Object.entries(hydrationData)) {
    System.hydrateQuery(id, events as any)
  }
}

const root = ReactDOM.createRoot(unwrap(document.getElementById("root")))
root.render(
  <StrictMode>
    <HelmetProvider context={helmetContext}>
      <IntlProvider>
        <SnortContext.Provider value={System}>
          <SpotlightContextWrapper>
            <RouterProvider router={router} />
          </SpotlightContextWrapper>
        </SnortContext.Provider>
      </IntlProvider>
    </HelmetProvider>
  </StrictMode>,
)

// Remove SSR shell on hydrate to prevent flash of loading state
// The React router will render the appropriate component immediately
if (typeof document !== "undefined") {
  queueMicrotask(() => {
    const ssrShell = document.getElementById("ssr-shell")
    if (ssrShell) {
      ssrShell.remove()
    }
  })
}
