import Menu from "@/Pages/settings/Menu";
import Profile from "@/Pages/settings/Profile";
import Relay from "@/Pages/settings/Relays";
import Preferences from "@/Pages/settings/Preferences";
import Notifications from "@/Pages/settings/Notifications";
import RelayInfo from "@/Pages/settings/RelayInfo";
import AccountsPage from "@/Pages/settings/Accounts";
import { ManageHandleRoutes } from "@/Pages/settings/handle";
import ExportKeys from "@/Pages/settings/Keys";
import ModerationSettings from "@/Pages/settings/Moderation";
import { CacheSettings } from "@/Pages/settings/Cache";
import { ReferralsPage } from "@/Pages/settings/Referrals";
import { Outlet } from "react-router-dom";
import { ToolsPage, ToolsPages } from "./tools";
import { WalletSettingsRoutes } from "./wallet";

const SettingsPage = () => {
  return (
    <div className="px-3">
      <Outlet />
    </div>
  );
};

export default [
  {
    path: "/settings",
    element: <SettingsPage />,
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
