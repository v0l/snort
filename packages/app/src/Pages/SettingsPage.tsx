import { FormattedMessage } from "react-intl";
import { Outlet, RouteObject, useNavigate } from "react-router-dom";
import SettingsIndex from "Pages/settings/Root";
import Profile from "Pages/settings/Profile";
import Relay from "Pages/settings/Relays";
import Preferences from "Pages/settings/Preferences";
import RelayInfo from "Pages/settings/RelayInfo";
import AccountsPage from "Pages/settings/Accounts";
import { WalletSettingsRoutes } from "Pages/settings/WalletSettings";
import { ManageHandleRoutes } from "Pages/settings/handle";
import ExportKeys from "Pages/settings/Keys";

import messages from "./messages";

export default function SettingsPage() {
  const navigate = useNavigate();

  return (
    <>
      <div className="main-content p">
        <h2 onClick={() => navigate("/settings")} className="pointer">
          <FormattedMessage {...messages.Settings} />
        </h2>
      </div>
      <Outlet />
    </>
  );
}

export const SettingsRoutes: RouteObject[] = [
  {
    path: "",
    element: <SettingsIndex />,
    children: [
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
        path: "accounts",
        element: <AccountsPage />,
      },
      {
        path: "keys",
        element: <ExportKeys />,
      },
      ...ManageHandleRoutes,
      ...WalletSettingsRoutes,
    ],
  },
];
