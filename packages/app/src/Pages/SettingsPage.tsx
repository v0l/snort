import { Outlet, RouteObject } from "react-router-dom";
import SettingsIndex from "@/Pages/settings/Root";
import Profile from "@/Pages/settings/Profile";
import Relay from "@/Pages/settings/Relays";
import Preferences from "@/Pages/settings/Preferences";
import RelayInfo from "@/Pages/settings/RelayInfo";
import AccountsPage from "@/Pages/settings/Accounts";
import { WalletSettingsRoutes } from "@/Pages/settings/WalletSettings";
import { ManageHandleRoutes } from "@/Pages/settings/handle";
import ExportKeys from "@/Pages/settings/Keys";
import ModerationSettings from "@/Pages/settings/Moderation";
import { CacheSettings } from "./settings/Cache";

import { ReferralsPage } from "./settings/Referrals";

export default function SettingsPage() {
  return (
    <>
      <Outlet />
    </>
  );
}

export const SettingsRoutes: RouteObject[] = [
  {
    path: "",
    element: <SettingsIndex />,
    children: [
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
      ...ManageHandleRoutes,
      ...WalletSettingsRoutes,
    ],
  },
];
