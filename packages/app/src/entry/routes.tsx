import type { RouteObject } from "react-router-dom"

import ErrorPage from "@/Pages/ErrorPage"
import { OnboardingRoutes } from "@/Pages/onboarding/routes"
import { RootRoutes } from "@/Pages/Root/RootRoutes"
import SettingsRoutes from "@/Pages/settings/Routes"

export const mainRoutes = [
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

export const routes: Array<RouteObject> = [
  {
    async lazy() {
      const { default: Layout } = await import("@/Pages/Layout")
      return { Component: Layout }
    },
    errorElement: <ErrorPage />,
    children: mainRoutes,
  },
  {
    path: "/component-debug",
    async lazy() {
      const { default: ComponentDebugPage } = await import("@/Pages/ComponentDebug")
      return { Component: ComponentDebugPage }
    },
  },
]
