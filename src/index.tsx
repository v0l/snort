import './index.css';

import { StrictMode } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import * as ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

// @ts-expect-error
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import EventPage from './pages/EventPage';
import Layout from './pages/Layout';
import LoginPage from './pages/Login';
import ProfilePage from './pages/ProfilePage';
import RootPage from './pages/Root';
import Store from "./state/Store";
import NotificationsPage from './pages/Notifications';
import NewUserPage from './pages/NewUserPage';
import SettingsPage from './pages/SettingsPage';
import ErrorPage from './pages/ErrorPage';
import VerificationPage from './pages/Verification';
import MessagesPage from './pages/MessagesPage';
import ChatPage from './pages/ChatPage';
import DonatePage from './pages/DonatePage';
import HashTagsPage from './pages/HashTagsPage';

/**
 * HTTP query provider
 */
const HTTP = new QueryClient()

serviceWorkerRegistration.register();

const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/",
        element: <RootPage />
      },
      {
        path: "/login",
        element: <LoginPage />
      },
      {
        path: "/e/:id",
        element: <EventPage />
      },
      {
        path: "/p/:id",
        element: <ProfilePage />
      },
      {
        path: "/notifications",
        element: <NotificationsPage />
      },
      {
        path: "/new",
        element: <NewUserPage />
      },
      {
        path: "/settings",
        element: <SettingsPage />
      },
      {
        path: "/verification",
        element: <VerificationPage />
      },
      {
        path: "/messages",
        element: <MessagesPage />
      },
      {
        path: "/messages/:id",
        element: <ChatPage />
      },
      {
        path: "/donate",
        element: <DonatePage />
      },
      {
        path: "/t/:tag",
        element: <HashTagsPage />
      }
    ]
  }
]);

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <Provider store={Store}>
      <QueryClientProvider client={HTTP}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </Provider>
  </StrictMode>
);
