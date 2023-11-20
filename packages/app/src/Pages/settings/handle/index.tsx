import { FormattedMessage } from "react-intl";
import { Outlet, RouteObject, useNavigate } from "react-router-dom";

import ListHandles from "./ListHandles";
import ManageHandleIndex from "./Manage";

export default function ManageHandlePage() {
  const navigate = useNavigate();

  return (
    <>
      <h3 onClick={() => navigate("/settings/handle")} className="pointer">
        <FormattedMessage defaultMessage="Nostr Address" id="9pMqYs" />
      </h3>
      <Outlet />
    </>
  );
}

export const ManageHandleRoutes = [
  {
    path: "/settings/handle",
    element: <ManageHandlePage />,
    children: [
      {
        path: "",
        element: <ListHandles />,
      },
      {
        path: "manage",
        element: <ManageHandleIndex />,
      },
    ],
  },
] as Array<RouteObject>;
