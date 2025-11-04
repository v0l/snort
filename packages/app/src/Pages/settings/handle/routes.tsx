import { FormattedMessage } from "react-intl";
import { Link, Outlet, RouteObject } from "react-router-dom";

function ManageHandlePage() {
  return (
    <>
      <Link to={ManageHandleRoutes[0].path!}>
        <h3>
          <FormattedMessage defaultMessage="Nostr Address" />
        </h3>
      </Link>
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
        index: true,
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
