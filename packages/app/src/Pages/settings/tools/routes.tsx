import { FormattedMessage } from "react-intl";
import type { RouteObject } from "react-router-dom";

import { SettingsMenuComponent } from "@/Pages/settings/Menu/SettingsMenuComponent";

import type { SettingsMenuItems } from "../Menu/Menu";

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
    async lazy() {
      const { PruneFollowList } = await import("..");
      return { Component: PruneFollowList };
    },
  },
  {
    path: "follows-relay-health",
    async lazy() {
      const { FollowsRelayHealth } = await import("..");
      return { Component: FollowsRelayHealth };
    },
  },
  {
    path: "sync-account",
    async lazy() {
      const { SyncAccountTool } = await import("..");
      return { Component: SyncAccountTool };
    },
  },
] as Array<RouteObject>;
