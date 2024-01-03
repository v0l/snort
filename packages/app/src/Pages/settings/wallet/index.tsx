import { RouteObject } from "react-router-dom";
import WalletSettings from "../WalletSettings";
import ConnectCashu from "./Cashu";
import ConnectLNC from "./LNC";
import ConnectLNDHub from "./LNDHub";
import ConnectNostrWallet from "./NWC";
import AlbyOAuth from "./Alby";

export const WalletSettingsRoutes = [
  {
    path: "/settings/wallet",
    element: <WalletSettings />,
  },
  {
    path: "/settings/wallet/lnc",
    element: <ConnectLNC />,
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
    path: "/settings/wallet/cashu",
    element: <ConnectCashu />,
  },
  {
    path: "/settings/wallet/alby",
    element: <AlbyOAuth />,
  },
] as Array<RouteObject>;
