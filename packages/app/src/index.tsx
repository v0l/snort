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
import ErrorPage from "@/Pages/ErrorPage"
import { OnboardingRoutes } from "@/Pages/onboarding/routes"
import { RootRoutes } from "@/Pages/Root/RootRoutes"
import SettingsRoutes from "@/Pages/settings/Routes"
import { System } from "@/system"
import { storeRefCode, unwrap } from "@/Utils"
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
const mainRoutes = [
  ...RootRoutes,
  {
    path: "/cache-debug",
    async lazy() {
      const { DebugPage } = await import("@/Pages/CacheDebug")
      return { Component: DebugPage }
    },
  },
  {
    path: "/help",
    async lazy() {
      const { default: HelpPage } = await import("@/Pages/HelpPage")
      return { Component: HelpPage }
    },
  },
  {
    path: "/e/:id",
    async lazy() {
      const { ThreadRoute } = await import("@/Components/Event/Thread/ThreadRoute")
      return { Component: ThreadRoute }
    },
  },
  {
    path: "/p/:id",
    async lazy() {
      const { default: ProfilePage } = await import("@/Pages/Profile/ProfilePage")
      return { Component: ProfilePage }
    },
  },
  {
    path: "/notifications",
    async lazy() {
      const { default: NotificationsPage } = await import("@/Pages/Notifications/Notifications")
      return { Component: NotificationsPage }
    },
  },
  {
    path: "/free-nostr-address",
    async lazy() {
      const { default: FreeNostrAddressPage } = await import("@/Pages/FreeNostrAddressPage")
      return { Component: FreeNostrAddressPage }
    },
  },
  {
    path: "/nostr-address",
    async lazy() {
      const { default: NostrAddressPage } = await import("@/Pages/NostrAddressPage")
      return { Component: NostrAddressPage }
    },
  },
  {
    path: "/messages/:id?",
    async lazy() {
      const { default: MessagesPage } = await import("@/Pages/Messages/MessagesPage")
      return { Component: MessagesPage }
    },
  },
  {
    path: "/about",
    async lazy() {
      const { default: DonatePage } = await import("@/Pages/Donate/DonatePage")
      return { Component: DonatePage }
    },
  },
  {
    path: "/search/:keyword?",
    async lazy() {
      const { default: SearchPage } = await import("@/Pages/SearchPage")
      return { Component: SearchPage }
    },
  },
  {
    path: "/list-feed/:id",
    async lazy() {
      const { ListFeedPage } = await import("@/Pages/ListFeedPage")
      return { Component: ListFeedPage }
    },
  },
  {
    path: "/changelog",
    async lazy() {
      const { AboutPage } = await import("@/Pages/About")
      return { Component: AboutPage }
    },
  },
  {
    path: "/wallet",
    async lazy() {
      const { default: WalletPage } = await import("@/Pages/wallet")
      const WalletPageWrapper = () => (
        <div className="px-3 py-2">
          <WalletPage showHistory={true} />
        </div>
      )
      return { Component: WalletPageWrapper }
    },
  },
  {
    path: "/wallet/send",
    async lazy() {
      const { WalletSendPage } = await import("@/Pages/wallet/send")
      return { Component: WalletSendPage }
    },
  },
  {
    path: "/wallet/receive",
    async lazy() {
      const { WalletReceivePage } = await import("@/Pages/wallet/receive")
      return { Component: WalletReceivePage }
    },
  },
  OnboardingRoutes,
  ...SettingsRoutes,
] as Array<RouteObject>

if (CONFIG.features.zapPool) {
  mainRoutes.push({
    path: "/zap-pool",
    async lazy() {
      const { default: ZapPoolPage } = await import("@/Pages/ZapPool/ZapPool")
      return { Component: ZapPoolPage }
    },
  })
}

if (CONFIG.features.subscriptions) {
  mainRoutes.push({
    path: "/subscribe",
    async lazy() {
      const { SubscribePage } = await import("@/Pages/subscribe")
      return { Component: SubscribePage }
    },
  })
  mainRoutes.push({
    path: "/subscribe/manage",
    async lazy() {
      const { default: ManageSubscriptionPage } = await import("@/Pages/subscribe/ManageSubscription")
      return { Component: ManageSubscriptionPage }
    },
  })
}

// add catch all route
mainRoutes.push({
  path: "/:link",
  async lazy() {
    const { default: NostrLinkHandler } = await import("@/Pages/NostrLinkHandler")
    return { Component: NostrLinkHandler }
  },
})

const routes = [
  {
    async lazy() {
      const { default: Layout } = await import("@/Pages/Layout")
      return { Component: Layout }
    },
    errorElement: <ErrorPage />,
    loader: async () => {
      if (!didInit) {
        didInit = true
        return await initSite()
      }
      return null
    },
    children: mainRoutes,
  },
  {
    path: "/component-debug",
    loader: async () => {
      if (!didInit) {
        didInit = true
        return await initSite()
      }
      return null
    },
    async lazy() {
      const { default: ComponentDebugPage } = await import("@/Pages/ComponentDebug")
      return { Component: ComponentDebugPage }
    },
  },
] as Array<RouteObject>

const router = createBrowserRouter(routes)

const root = ReactDOM.createRoot(unwrap(document.getElementById("root")))
root.render(
  <StrictMode>
    <HelmetProvider>
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
