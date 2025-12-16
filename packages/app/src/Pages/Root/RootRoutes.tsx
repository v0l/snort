import { lazy } from "react";
import { Outlet, type RouteObject, useLocation } from "react-router-dom";

import { LiveStreams } from "@/Components/LiveStream/LiveStreams";
import { RootTabRoutes } from "@/Pages/Root/RootTabRoutes";
import { getCurrentRefCode } from "@/Utils";

const InviteModal = lazy(() => import("@/Components/Invite"));
export default function RootPage() {
  const code = getCurrentRefCode();
  const location = useLocation();
  return (
    <>
      {(location.pathname === "/" || location.pathname === "/following") && <LiveStreams />}
      <div>
        <Outlet />
      </div>
      {code && <InviteModal />}
    </>
  );
}
export const RootRoutes = [
  {
    path: "/",
    element: <RootPage />,
    children: RootTabRoutes,
  },
] as RouteObject[];
