import "./index.css";
import "@szhsin/react-menu/dist/index.css";

import { StrictMode } from "react";
import { QueryClient, QueryClientProvider } from "react-query";
import * as ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import * as serviceWorkerRegistration from "serviceWorkerRegistration";
import Store from "State/Store";
import EventPage from "Pages/EventPage";
import Layout from "Pages/Layout";
import LoginPage from "Pages/Login";
import ProfilePage from "Pages/ProfilePage";
import RootPage from "Pages/Root";
import NotificationsPage from "Pages/Notifications";
import SettingsPage, { SettingsRoutes } from "Pages/SettingsPage";
import ErrorPage from "Pages/ErrorPage";
import VerificationPage from "Pages/Verification";
import MessagesPage from "Pages/MessagesPage";
import ChatPage from "Pages/ChatPage";
import DonatePage from "Pages/DonatePage";
import HashTagsPage from "Pages/HashTagsPage";
import SearchPage from "Pages/SearchPage";
import HelpPage from "Pages/HelpPage";
import { NewUserRoutes } from "Pages/new";
import NostrLinkHandler from "Pages/NostrLinkHandler";
import { IntlProvider } from "./IntlProvider";
import { unwrap } from "Util";

/**
 * HTTP query provider
 */
const HTTP = new QueryClient();

serviceWorkerRegistration.register();

export const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/",
        element: <RootPage />,
      },
      {
        path: "/login",
        element: <LoginPage />,
      },
      {
        path: "/help",
        element: <HelpPage />,
      },
      {
        path: "/e/:id",
        element: <EventPage />,
      },
      {
        path: "/p/:id",
        element: <ProfilePage />,
      },
      {
        path: "/notifications",
        element: <NotificationsPage />,
      },
      {
        path: "/settings",
        element: <SettingsPage />,
        children: SettingsRoutes,
      },
      {
        path: "/verification",
        element: <VerificationPage />,
      },
      {
        path: "/messages",
        element: <MessagesPage />,
      },
      {
        path: "/messages/:id",
        element: <ChatPage />,
      },
      {
        path: "/donate",
        element: <DonatePage />,
      },
      {
        path: "/t/:tag",
        element: <HashTagsPage />,
      },
      {
        path: "/search/:keyword?",
        element: <SearchPage />,
      },
      {
        path: "/handler/*",
        element: <NostrLinkHandler />,
      },
      ...NewUserRoutes,
    ],
  },
]);

const root = ReactDOM.createRoot(unwrap(document.getElementById("root")));
root.render(
  <StrictMode>
    <Provider store={Store}>
      <QueryClientProvider client={HTTP}>
        <IntlProvider>
          <RouterProvider router={router} />
        </IntlProvider>
      </QueryClientProvider>
    </Provider>
  </StrictMode>
);
