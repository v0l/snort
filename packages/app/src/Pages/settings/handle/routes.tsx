import { FormattedMessage } from "react-intl";
import { Outlet, RouteObject, useNavigate } from "react-router-dom";

function ManageHandlePage() {
  const navigate = useNavigate();

  return (
    <>
      <h3 onClick={() => navigate("/settings/handle")} className="pointer">
        <FormattedMessage defaultMessage="Nostr Address" />
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
        async lazy() {
          const { ListHandles } = await import("..");
          return { Component: ListHandles };
        },
      },
      {
        path: "manage",
        async lazy() {
          const { ManageHandleIndex } = await import("..");
          return { Component: ManageHandleIndex };
        },
      },
    ],
  },
] as Array<RouteObject>;
