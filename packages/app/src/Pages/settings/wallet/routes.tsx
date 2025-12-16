import type { RouteObject } from "react-router-dom";

export const WalletSettingsRoutes = [
  {
    path: "/settings/wallet",
    async lazy() {
      const { WalletSettings } = await import("..");
      return { Component: WalletSettings };
    },
  },
  {
    path: "/settings/wallet/lndhub",
    async lazy() {
      const { ConnectLNDHub } = await import("..");
      return { Component: ConnectLNDHub };
    },
  },
  {
    path: "/settings/wallet/nwc",
    async lazy() {
      const { ConnectNostrWallet } = await import("..");
      return { Component: ConnectNostrWallet };
    },
  },
  {
    path: "/settings/wallet/alby",
    async lazy() {
      const { AlbyOAuth } = await import("..");
      return { Component: AlbyOAuth };
    },
  },
] as Array<RouteObject>;
