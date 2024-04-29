import { FormattedMessage } from "react-intl";
import { Outlet, RouteObject } from "react-router-dom";

import { SettingsMenuComponent } from "@/Pages/settings/Menu/SettingsMenuComponent";

import { SettingsMenuItems } from "../Menu/Menu";
import { FollowsRelayHealth } from "./follows-relay-health";
import { PruneFollowList } from "./prune-follows";
import SyncAccountTool from "./sync-account";

const ToolMenuItems = [
  {
    title: <FormattedMessage defaultMessage="Follow List" />,
    items: [
      {
        icon: "trash",
        iconBg: "bg-red-500",
        message: <FormattedMessage defaultMessage="Prune Follow List" />,
        path: "prune-follows",
      },
      {
        icon: "medical-cross",
        iconBg: "bg-green-800",
        message: <FormattedMessage defaultMessage="Follows Relay Health" />,
        path: "follows-relay-health",
      },
    ],
  },
  {
    title: <FormattedMessage defaultMessage="Account Data" />,
    items: [
      {
        icon: "repost",
        iconBg: "bg-blue-800",
        message: <FormattedMessage defaultMessage="Sync Account" />,
        path: "sync-account",
      },
    ],
  },
] as SettingsMenuItems;

export const ToolsPages = [
  {
    path: "",
    element: (
      <>
        <h2>
          <FormattedMessage defaultMessage="Tools" />
        </h2>
        <SettingsMenuComponent menu={ToolMenuItems} />
      </>
    ),
  },
  {
    path: "prune-follows",
    element: <PruneFollowList />,
  },
  {
    path: "follows-relay-health",
    element: <FollowsRelayHealth />,
  },
  {
    path: "sync-account",
    element: <SyncAccountTool />,
  },
] as Array<RouteObject>;

export function ToolsPage() {
  return <Outlet />;
}
