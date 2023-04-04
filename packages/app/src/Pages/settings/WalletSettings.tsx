import "./WalletSettings.css";
import LndLogo from "lnd-logo.png";
import { FormattedMessage } from "react-intl";
import { RouteObject, useNavigate } from "react-router-dom";

import BlueWallet from "Icons/BlueWallet";
import ConnectLNC from "Pages/settings/wallet/LNC";
import ConnectLNDHub from "./wallet/LNDHub";
import ConnectCashu from "./wallet/Cashu";

import CashuLogo from "cashu.png";

const WalletSettings = () => {
  const navigate = useNavigate();
  return (
    <>
      <h3>
        <FormattedMessage defaultMessage="Connect Wallet" />
      </h3>
      <div className="wallet-grid">
        <div className="card" onClick={() => navigate("/settings/wallet/lnc")}>
          <img src={LndLogo} width={100} />
          <h3 className="f-end">LND with LNC</h3>
        </div>
        {
          <div className="card" onClick={() => navigate("/settings/wallet/lndhub")}>
            <BlueWallet width={100} height={100} />
            <h3 className="f-end">LNDHub</h3>
          </div>
        }
        <div className="card" onClick={() => navigate("/settings/wallet/cashu")}>
          <img src={CashuLogo} width={100} />
          <h3 className="f-end">Cashu</h3>
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
    path: "/settings/wallet/cashu",
    element: <ConnectCashu />,
  },
] as Array<RouteObject>;
