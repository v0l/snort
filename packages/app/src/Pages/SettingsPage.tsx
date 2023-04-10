import { FormattedMessage } from "react-intl";
import { Outlet, RouteObject, useNavigate } from "react-router-dom";
import SettingsIndex from "Pages/settings/Index";
import Profile from "Pages/settings/Profile";
import Relay from "Pages/settings/Relays";
import Preferences from "Pages/settings/Preferences";
import RelayInfo from "Pages/settings/RelayInfo";
import { WalletSettingsRoutes } from "Pages/settings/WalletSettings";
import Nip5ManagePage from "Pages/settings/ManageNip5";

import messages from "./messages";
import DelegationPage from "./settings/Delegation";

export default function SettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="main-content">
      <h2 onClick={() => navigate("/settings")} className="pointer">
        <FormattedMessage {...messages.Settings} />
      </h2>
      <Outlet />
    </div>
  );
}

export const SettingsRoutes: RouteObject[] = [
  {
    path: "",
    element: <SettingsIndex />,
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
    path: "nip5",
    element: <Nip5ManagePage />,
  },
  {
    path: "delegation",
    element: <DelegationPage />,
  },
  ...WalletSettingsRoutes,
];
