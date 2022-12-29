
import './index.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux'
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";

import { NostrSystem } from './nostr/System';
import EventPage from './pages/EventPage';
import Layout from './pages/Layout';
import LoginPage from './pages/Login';
import ProfilePage from './pages/ProfilePage';
import RootPage from './pages/Root';
import Store from "./state/Store";

const System = new NostrSystem();
export const NostrContext = React.createContext();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <NostrContext.Provider value={System}>
      <Provider store={Store}>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" exact element={<RootPage/>} />
              <Route path="/login" exact element={<LoginPage />} />
              <Route path="/e/:id" exact element={<EventPage />} />
              <Route path="/p/:id" exact element={<ProfilePage />} />
            </Routes>
          </Layout>
        </Router>
      </Provider>
    </NostrContext.Provider>
  </React.StrictMode>
);
