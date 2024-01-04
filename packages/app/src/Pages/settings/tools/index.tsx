import { FormattedMessage } from "react-intl";
import { Outlet, RouteObject } from "react-router-dom";

import { SettingsMenuComponent, SettingsMenuItems } from "../Menu";
import { FollowsRelayHealth } from "./follows-relay-health";
import { PruneFollowList } from "./prune-follows";

const ToolMenuItems = [
  {
    title: <FormattedMessage defaultMessage="Follow List" id="CM+Cfj" />,
    items: [
      {
        icon: "trash",
        iconBg: "bg-red-500",
        message: <FormattedMessage defaultMessage="Prune Follow List" id="hF6IN2" />,
        path: "prune-follows",
      },
      {
        icon: "medical-cross",
        iconBg: "bg-green-800",
        message: <FormattedMessage defaultMessage="Follows Relay Health" id="XQiFEl" />,
        path: "follows-relay-health",
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
          <FormattedMessage defaultMessage="Tools" id="nUT0Lv" />
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
] as Array<RouteObject>;

export function ToolsPage() {
  return <Outlet />;
}
