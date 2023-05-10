import "./index.css";
import { RouteObject } from "react-router-dom";

import GetVerified from "Pages/new/GetVerified";
import ProfileSetup from "Pages/new/ProfileSetup";
import NewUserFlow from "Pages/new/NewUserFlow";
import ImportFollows from "Pages/new/ImportFollows";
import DiscoverFollows from "Pages/new/DiscoverFollows";

export const PROFILE = "/new/profile";
export const IMPORT = "/new/import";
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
    path: IMPORT,
    element: <ImportFollows />,
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
