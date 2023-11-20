import "./WalletSettings.css";
import LndLogo from "@/lnd-logo.png";
import { FormattedMessage } from "react-intl";
import { Link, RouteObject, useNavigate } from "react-router-dom";

import BlueWallet from "@/Icons/BlueWallet";
import ConnectLNC from "@/Pages/settings/wallet/LNC";
import ConnectLNDHub from "@/Pages/settings/wallet/LNDHub";
import ConnectNostrWallet from "@/Pages/settings/wallet/NWC";
import ConnectCashu from "@/Pages/settings/wallet/Cashu";

import NostrIcon from "@/Icons/Nostrich";

const WalletSettings = () => {
  const navigate = useNavigate();
  return (
    <>
      <Link to="/wallet">
        <button type="button">
          <FormattedMessage defaultMessage="View Wallets" id="VvaJst" />
        </button>
      </Link>
      <h3>
        <FormattedMessage defaultMessage="Connect Wallet" id="cg1VJ2" />
      </h3>
      <div className="wallet-grid">
        <div onClick={() => navigate("/settings/wallet/lnc")}>
          <img src={LndLogo} width={100} />
          <h3>LND with LNC</h3>
        </div>
        <div onClick={() => navigate("/settings/wallet/lndhub")}>
          <BlueWallet width={100} height={100} />
          <h3>LNDHub</h3>
        </div>
        <div onClick={() => navigate("/settings/wallet/nwc")}>
          <NostrIcon width={100} height={100} />
          <h3>Nostr Wallet Connect</h3>
        </div>
      </div>
    </>
  );
};

export default WalletSettings;

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
] as Array<RouteObject>;
