import { ReactNode, useCallback } from "react";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";

import useLogin from "@/Hooks/useLogin";
import { SettingsMenuComponent } from "@/Pages/settings/Menu/SettingsMenuComponent";
import { LoginStore, logout } from "@/Utils/Login";
import { getCurrentSubscription } from "@/Utils/Subscription";

export type SettingsMenuItems = Array<{
  title: ReactNode;
  items: Array<{
    icon: string;
    iconBg: string;
    message: ReactNode;
    path?: string;
    action?: () => void;
  }>;
}>;

const SettingsIndex = () => {
  const login = useLogin();
  const navigate = useNavigate();
  const sub = getCurrentSubscription(LoginStore.allSubscriptions());

  const handleLogout = useCallback(() => {
    logout(login.id);
    navigate("/");
  }, [login.id, navigate]);

  const settingsGroups = [
    {
      title: <FormattedMessage id="TwyMau" defaultMessage="Account" />,
      items: [
        {
          icon: "profile",
          iconBg: "bg-green-500",
          message: <FormattedMessage id="itPgxd" defaultMessage="Profile" />,
          path: "profile",
        },
        {
          icon: "key",
          iconBg: "bg-amber-500",
          message: <FormattedMessage id="08zn6O" defaultMessage="Export Keys" />,
          path: "keys",
        },
        ...(CONFIG.features.nostrAddress
          ? [
              {
                icon: "badge",
                iconBg: "bg-pink-500",
                message: <FormattedMessage id="9pMqYs" defaultMessage="Nostr Address" />,
                path: "handle",
              },
            ]
          : []),
        {
          icon: "gear",
          iconBg: "bg-slate-500",
          message: <FormattedMessage id="PCSt5T" defaultMessage="Preferences" />,
          path: "preferences",
        },
        {
          icon: "wallet",
          iconBg: "bg-emerald-500",
          message: <FormattedMessage id="3yk8fB" defaultMessage="Wallet" />,
          path: "wallet",
        },
        ...(sub
          ? [
              {
                icon: "code-circle",
                iconBg: "bg-indigo-500",
                message: <FormattedMessage id="FvanT6" defaultMessage="Accounts" />,
                path: "accounts",
              },
            ]
          : []),
        {
          icon: "tool",
          iconBg: "bg-slate-800",
          message: <FormattedMessage defaultMessage="Tools" id="nUT0Lv" />,
          path: "tools",
        },
      ],
    },
    {
      title: <FormattedMessage id="hvFRBo" defaultMessage="Interaction" />,
      items: [
        {
          icon: "relay",
          iconBg: "bg-dark bg-opacity-20",
          message: <FormattedMessage id="RoOyAh" defaultMessage="Relays" />,
          path: "relays",
        },
        {
          icon: "shield-tick",
          iconBg: "bg-yellow-500",
          message: <FormattedMessage id="wofVHy" defaultMessage="Moderation" />,
          path: "moderation",
        },
        ...(CONFIG.features.pushNotifications
          ? [
              {
                icon: "bell-outline",
                iconBg: "bg-red-500",
                message: <FormattedMessage id="NAidKb" defaultMessage="Notifications" />,
                path: "notifications",
              },
            ]
          : []),
        ...(CONFIG.features.communityLeaders
          ? [
              {
                icon: "link",
                iconBg: "bg-blue-500",
                message: <FormattedMessage id="hYOE+U" defaultMessage="Invite" />,
                path: "invite",
              },
            ]
          : []),
        {
          icon: "hard-drive",
          iconBg: "bg-cyan-500",
          message: <FormattedMessage id="DBiVK1" defaultMessage="Cache" />,
          path: "cache",
        },
      ],
    },
    {
      title: <FormattedMessage id="HqRNN8" defaultMessage="Support" />,
      items: [
        {
          icon: "heart",
          iconBg: "bg-purple-500",
          message: <FormattedMessage id="2IFGap" defaultMessage="Donate" />,
          path: "/donate",
        },
        ...(CONFIG.features.subscriptions
          ? [
              {
                icon: "diamond",
                iconBg: "bg-violet-500",
                message: <FormattedMessage id="R/6nsx" defaultMessage="Subscription" />,
                path: "/subscribe/manage",
              },
            ]
          : []),
        ...(CONFIG.features.zapPool
          ? [
              {
                icon: "piggy-bank",
                iconBg: "bg-rose-500",
                message: <FormattedMessage id="i/dBAR" defaultMessage="Zap Pool" />,
                path: "/zap-pool",
              },
            ]
          : []),
      ],
    },
    {
      title: <FormattedMessage id="H0JBH6" defaultMessage="Log Out" />,
      items: [
        {
          icon: "logout",
          iconBg: "bg-red-500",
          message: <FormattedMessage id="H0JBH6" defaultMessage="Log Out" />,
          action: handleLogout,
        },
      ],
    },
  ] as SettingsMenuItems;

  return <SettingsMenuComponent menu={settingsGroups} />;
};

export default SettingsIndex;
