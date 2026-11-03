import "./index.css"
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
import { makeRoutes } from "@/routes"
import { finishHydration, loadHydration, seed, seededProfiles } from "@/ssr/client"
import { HydrationDone } from "@/ssr/hydration-done"
import { System } from "@/system"
import { storeRefCode, unwrap } from "@/Utils"
import { reloadOnStaleChunk } from "@/Utils/staleChunkReload"
import { hasWasm, WasmPath, wasmInit } from "@/Utils/wasm"
import { setupWebLNWalletConfig, Wallets } from "@/Wallet"
import { SpotlightContextWrapper } from "./Components/Spotlight/context"
import { Day } from "./Utils/Const"
import { LoginStore } from "./Utils/Login"

async function initSite() {
  EventBuilder.ClientTag = [
    "client",
    CONFIG.appNameCapitalized,
    "31990:84de35e2584d2b144aae823c9ed0b0f3deda09648530b93d1a2a146d1dea9864:app-profile",
  ]
  storeRefCode()
  if (hasWasm) {
    await wasmInit({ module_or_path: WasmPath })
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
const routes = makeRoutes(async () => {
  if (!didInit) {
    didInit = true
    return await initSite()
  }
  return null
})

reloadOnStaleChunk()

const serverRendered = loadHydration()
const systemQuery = System.Query.bind(System)
System.Query = rb => {
  seed(rb)
  return systemQuery(rb)
}
for (const profile of seededProfiles()) {
  System.profileLoader.cache.set(profile)
}

const router = createBrowserRouter(routes)
const rootElement = unwrap(document.getElementById("root"))
const tree = (
  <StrictMode>
    <HelmetProvider>
      <IntlProvider>
        <SnortContext.Provider value={System}>
          <SpotlightContextWrapper>
            <RouterProvider router={router} />
          </SpotlightContextWrapper>
        </SnortContext.Provider>
      </IntlProvider>
      <HydrationDone />
    </HelmetProvider>
  </StrictMode>
)

function mount() {
  if (serverRendered && rootElement.hasChildNodes() && router.state.initialized && !router.state.errors) {
    ReactDOM.hydrateRoot(rootElement, tree)
  } else {
    finishHydration()
    rootElement.replaceChildren()
    ReactDOM.createRoot(rootElement).render(tree)
  }
}

if (router.state.initialized) {
  mount()
} else {
  const unsubscribe = router.subscribe(state => {
    if (state.initialized) {
      unsubscribe()
      mount()
    }
  })
}
