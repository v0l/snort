import { Outlet } from "react-router-dom";

import AccountsPage from "@/Pages/settings/Accounts";
import { CacheSettings } from "@/Pages/settings/Cache";
import { ManageHandleRoutes } from "@/Pages/settings/handle";
import ExportKeys from "@/Pages/settings/Keys";
import Menu from "@/Pages/settings/Menu/Menu";
import ModerationSettings from "@/Pages/settings/Moderation";
import Notifications from "@/Pages/settings/Notifications";
import Preferences from "@/Pages/settings/Preferences";
import Profile from "@/Pages/settings/Profile";
import { ReferralsPage } from "@/Pages/settings/Referrals";
import RelayInfo from "@/Pages/settings/RelayInfo";
import Relay from "@/Pages/settings/Relays";

import { ToolsPage, ToolsPages } from "./tools";
import { WalletSettingsRoutes } from "./wallet";

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
        element: <Menu />,
      },
      {
        path: "profile",
        element: <Profile />,
      },
      {
        path: "relays",
        element: <Relay />,
      },
      {
        path: "relays/:id",
        element: <RelayInfo />,
      },
      {
        path: "preferences",
        element: <Preferences />,
      },
      {
        path: "notifications",
        element: <Notifications />,
      },
      {
        path: "accounts",
        element: <AccountsPage />,
      },
      {
        path: "keys",
        element: <ExportKeys />,
      },
      {
        path: "moderation",
        element: <ModerationSettings />,
      },
      {
        path: "cache",
        element: <CacheSettings />,
      },
      {
        path: "invite",
        element: <ReferralsPage />,
      },
      {
        path: "tools",
        element: <ToolsPage />,
        children: ToolsPages,
      },
      ...ManageHandleRoutes,
      ...WalletSettingsRoutes,
    ],
  },
];
