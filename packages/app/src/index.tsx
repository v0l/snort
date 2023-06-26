import "./index.css";
import "@szhsin/react-menu/dist/index.css";
import "public/manifest.json";

import { StrictMode } from "react";
import * as ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { EventPublisher, NostrSystem, ProfileLoaderService } from "@snort/system";

import * as serviceWorkerRegistration from "serviceWorkerRegistration";
import { IntlProvider } from "IntlProvider";
import { unwrap } from "SnortUtils";
import Store from "State/Store";
import Layout from "Pages/Layout";
import LoginPage from "Pages/LoginPage";
import ProfilePage from "Pages/ProfilePage";
import { RootRoutes } from "Pages/Root";
import NotificationsPage from "Pages/Notifications";
import SettingsPage, { SettingsRoutes } from "Pages/SettingsPage";
import ErrorPage from "Pages/ErrorPage";
import VerificationPage from "Pages/Verification";
import MessagesPage from "Pages/MessagesPage";
import DonatePage from "Pages/DonatePage";
import HashTagsPage from "Pages/HashTagsPage";
import SearchPage from "Pages/SearchPage";
import HelpPage from "Pages/HelpPage";
import { NewUserRoutes } from "Pages/new";
import { WalletRoutes } from "Pages/WalletPage";
import NostrLinkHandler from "Pages/NostrLinkHandler";
import Thread from "Element/Thread";
import { SubscribeRoutes } from "Pages/subscribe";
import ZapPoolPage from "Pages/ZapPool";
import DebugPage from "Pages/Debug";
import { db } from "Db";
import { preload, RelayMetrics, UserCache, UserRelays } from "Cache";
import { LoginStore } from "Login";
import { LivePage } from "Pages/LivePage";

/**
 * Singleton nostr system
 */
export const System = new NostrSystem({
  relayCache: UserRelays,
  profileCache: UserCache,
  relayMetrics: RelayMetrics,
  authHandler: async (c, r) => {
    const { publicKey, privateKey } = LoginStore.snapshot();
    if (publicKey) {
      const pub = new EventPublisher(publicKey, privateKey);
      return await pub.nip42Auth(c, r);
    }
  },
});

/**
 * Singleton user profile loader
 */
export const ProfileLoader = new ProfileLoaderService(System, UserCache);

// @ts-expect-error Setting webpack nonce
window.__webpack_nonce__ = "ZmlhdGphZiBzYWlkIHNub3J0LnNvY2lhbCBpcyBwcmV0dHkgZ29vZCwgd2UgbWFkZSBpdCE=";

serviceWorkerRegistration.register();

export const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <ErrorPage />,
    loader: async () => {
      const login = LoginStore.takeSnapshot();
      db.ready = await db.isAvailable();
      if (db.ready) {
        await preload(login.follows.item);
      }

      for (const [k, v] of Object.entries(login.relays.item)) {
        System.ConnectToRelay(k, v);
      }
      try {
        if ("registerProtocolHandler" in window.navigator) {
          window.navigator.registerProtocolHandler(
            "web+nostr",
            `${window.location.protocol}//${window.location.host}/%s`
          );
          console.info("Registered protocol handler for 'web+nostr'");
        }
      } catch (e) {
        console.error("Failed to register protocol handler", e);
      }
      return null;
    },
    children: [
      ...RootRoutes,
      {
        path: "/login",
        element: <LoginPage />,
      },
      {
        path: "/help",
        element: <HelpPage />,
      },
      {
        path: "/e/:id",
        element: <Thread />,
      },
      {
        path: "/p/:id",
        element: <ProfilePage />,
      },
      {
        path: "/notifications",
        element: <NotificationsPage />,
      },
      {
        path: "/settings",
        element: <SettingsPage />,
        children: SettingsRoutes,
      },
      {
        path: "/verification",
        element: <VerificationPage />,
      },
      {
        path: "/messages/:id?",
        element: <MessagesPage />,
      },
      {
        path: "/donate",
        element: <DonatePage />,
      },
      {
        path: "/t/:tag",
        element: <HashTagsPage />,
      },
      {
        path: "/search/:keyword?",
        element: <SearchPage />,
      },
      {
        path: "/zap-pool",
        element: <ZapPoolPage />,
      },
      {
        path: "/live/:id",
        element: <LivePage />,
      },
      ...NewUserRoutes,
      ...WalletRoutes,
      ...SubscribeRoutes,
      {
        path: "/debug",
        element: <DebugPage />,
      },
      {
        path: "/*",
        element: <NostrLinkHandler />,
      },
    ],
  },
]);

const root = ReactDOM.createRoot(unwrap(document.getElementById("root")));
root.render(
  <StrictMode>
    <Provider store={Store}>
      <IntlProvider>
        <RouterProvider router={router} />
      </IntlProvider>
    </Provider>
  </StrictMode>
);
