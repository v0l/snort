import './index.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

import { NostrSystem } from './nostr/System';
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

/**
 * Nostr websocket managment system
 */
export const System = new NostrSystem();

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
      }
    ]
  }
]);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={Store}>
      <RouterProvider router={router} />
    </Provider>
  </React.StrictMode>
);
