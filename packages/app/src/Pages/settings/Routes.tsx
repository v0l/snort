import { Outlet } from "react-router-dom";

import { ManageHandleRoutes } from "@/Pages/settings/handle/routes";

import { ToolsPages } from "./tools/routes";
import { WalletSettingsRoutes } from "./wallet/routes";

export default [
  {
    path: "/settings",
    element: (
      <div className="px-3">
        <Outlet />
      </div>
    ),
    children: [
      {
        path: "",
        async lazy() {
          const { Menu } = await import(".");
          return { Component: Menu };
        },
      },
      {
        path: "profile",
        async lazy() {
          const { Profile } = await import(".");
          return { Component: Profile };
        },
      },
      {
        path: "relays",
        async lazy() {
          const { Relay } = await import(".");
          return { Component: Relay };
        },
      },
      {
        path: "relays/:id",
        async lazy() {
          const { RelayInfo } = await import(".");
          return { Component: RelayInfo };
        },
      },
      {
        path: "preferences",
        async lazy() {
          const { Preferences } = await import(".");
          return { Component: Preferences };
        },
      },
      {
        path: "notifications",
        async lazy() {
          const { Notifications } = await import(".");
          return { Component: Notifications };
        },
      },
      {
        path: "accounts",
        async lazy() {
          const { AccountsPage } = await import(".");
          return { Component: AccountsPage };
        },
      },
      {
        path: "keys",
        async lazy() {
          const { ExportKeys } = await import(".");
          return { Component: ExportKeys };
        },
      },
      {
        path: "moderation",
        async lazy() {
          const { ModerationSettings } = await import(".");
          return { Component: ModerationSettings };
        },
      },
      {
        path: "cache",
        async lazy() {
          const { CacheSettings } = await import(".");
          return { Component: CacheSettings };
        },
      },
      {
        path: "media",
        async lazy() {
          const { MediaSettingsPage } = await import(".");
          return { Component: MediaSettingsPage };
        },
      },
      {
        path: "invite",
        async lazy() {
          const { ReferralsPage } = await import(".");
          return { Component: ReferralsPage };
        },
      },
      {
        path: "tools",
        async lazy() {
          const { ToolsPage } = await import(".");
          return { Component: ToolsPage };
        },
        children: ToolsPages,
      },
      ...ManageHandleRoutes,
      ...WalletSettingsRoutes,
    ],
  },
];
