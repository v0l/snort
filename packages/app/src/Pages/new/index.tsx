import "./index.css";
import { RouteObject } from "react-router-dom";

import GetVerified from "Pages/new/GetVerified";
import ProfileSetup from "Pages/new/ProfileSetup";
import NewUserFlow from "Pages/new/NewUserFlow";
import DiscoverFollows from "Pages/new/DiscoverFollows";

export const PROFILE = "/new/profile";
export const DISCOVER = "/new/discover";
export const VERIFY = "/new/verify";

export const NewUserRoutes: RouteObject[] = [
  {
    path: "/new",
    element: <NewUserFlow />,
  },
  {
    path: PROFILE,
    element: <ProfileSetup />,
  },
  {
    path: VERIFY,
    element: <GetVerified />,
  },
  {
    path: DISCOVER,
    element: <DiscoverFollows />,
  },
];
