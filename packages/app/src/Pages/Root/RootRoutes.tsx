import { lazy } from "react";
import { Outlet, RouteObject } from "react-router-dom";

import { LiveStreams } from "@/Components/LiveStream/LiveStreams";
import { RootTabRoutes } from "@/Pages/Root/RootTabRoutes";
import { getCurrentRefCode } from "@/Utils";

const InviteModal = lazy(() => import("@/Components/Invite"));
export default function RootPage() {
  const code = getCurrentRefCode();
  return (
    <>
      <LiveStreams />
      <div className="main-content">
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
