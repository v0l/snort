import { RouteObject } from "react-router-dom";

import WalletSettings from "../WalletSettings";
import AlbyOAuth from "./Alby";
import ConnectLNDHub from "./LNDHub";
import ConnectNostrWallet from "./NWC";

export const WalletSettingsRoutes = [
  {
    path: "/settings/wallet",
    element: <WalletSettings />,
  },
  {
    path: "/settings/wallet/lndhub",
    element: <ConnectLNDHub />,
  },
  {
    path: "/settings/wallet/nwc",
    element: <ConnectNostrWallet />,
  },
  {
    path: "/settings/wallet/alby",
    element: <AlbyOAuth />,
  },
] as Array<RouteObject>;
