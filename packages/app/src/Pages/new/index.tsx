import "./index.css";
import { RouteObject } from "react-router-dom";

import GetVerified from "Pages/new/GetVerified";
import NewUserName from "Pages/new/NewUsername";
import NewUserFlow from "Pages/new/NewUserFlow";
import ImportFollows from "Pages/new/ImportFollows";
import DiscoverFollows from "Pages/new/DiscoverFollows";

const USERNAME = "/new/username";
const IMPORT = "/new/import";
const DISCOVER = "/new/discover";
const VERIFY = "/new/verify";

export const NewUserRoutes: RouteObject[] = [
  {
    path: "/new",
    element: <NewUserFlow />,
  },
  {
    path: USERNAME,
    element: <NewUserName />,
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
