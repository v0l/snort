import "./Root.css";
import { useEffect, useMemo } from "react";
import FormattedMessage from "Element/FormattedMessage";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Icon from "Icons/Icon";
import { LoginStore, logout } from "Login";
import useLogin from "Hooks/useLogin";
import { getCurrentSubscription } from "Subscription";
import usePageWidth from "Hooks/usePageWidth";

import messages from "./messages";

const SettingsIndex = () => {
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const pageWidth = usePageWidth();
  const sub = getCurrentSubscription(LoginStore.allSubscriptions());

  function handleLogout() {
    logout(login.id);
    navigate("/");
  }

  useEffect(() => {
    if (location.pathname === "/settings" && pageWidth >= 768) {
      navigate("/settings/profile", { replace: true });
    }
  }, [location, pageWidth]);

  const [hideMenu, hideContent] = useMemo(() => {
    return [location.pathname !== "/settings" && pageWidth < 768, location.pathname === "/settings" && pageWidth < 768];
  }, [location, pageWidth]);

  return (
    <div className="settings-nav">
      {!hideMenu && (
        <div>
          <div className="settings-row" onClick={() => navigate("profile")}>
            <Icon name="profile" size={24} />
            <FormattedMessage {...messages.Profile} />
            <Icon name="arrowFront" size={16} />
          </div>
          <div className="settings-row" onClick={() => navigate("relays")}>
            <Icon name="relay" size={24} />
            <FormattedMessage {...messages.Relays} />
            <Icon name="arrowFront" size={16} />
          </div>
          <div className="settings-row" onClick={() => navigate("keys")}>
            <Icon name="key" size={24} />
            <FormattedMessage defaultMessage="Export Keys" />
            <Icon name="arrowFront" size={16} />
          </div>
          <div className="settings-row" onClick={() => navigate("moderation")}>
            <Icon name="shield-tick" size={24} />
            <FormattedMessage defaultMessage="Moderation" />
            <Icon name="arrowFront" size={16} />
          </div>
          <div className="settings-row" onClick={() => navigate("handle")}>
            <Icon name="badge" size={24} />
            <FormattedMessage defaultMessage="Nostr Address" />
            <Icon name="arrowFront" size={16} />
          </div>
          {CONFIG.features.subscriptions && (
            <div className="settings-row" onClick={() => navigate("/subscribe/manage")}>
              <Icon name="diamond" size={24} />
              <FormattedMessage defaultMessage="Subscription" />
              <Icon name="arrowFront" size={16} />
            </div>
          )}
          {sub && (
            <div className="settings-row" onClick={() => navigate("accounts")}>
              <Icon name="code-circle" size={24} />
              <FormattedMessage defaultMessage="Account Switcher" />
              <Icon name="arrowFront" size={16} />
            </div>
          )}

          <div className="settings-row" onClick={() => navigate("preferences")}>
            <Icon name="gear" size={24} />
            <FormattedMessage {...messages.Preferences} />
            <Icon name="arrowFront" size={16} />
          </div>

          <div className="settings-row" onClick={() => navigate("wallet")}>
            <Icon name="wallet" size={24} />
            <FormattedMessage defaultMessage="Wallet" />
            <Icon name="arrowFront" size={16} />
          </div>
          <div className="settings-row" onClick={() => navigate("/donate")}>
            <Icon name="heart" size={24} />
            <FormattedMessage {...messages.Donate} />
            <Icon name="arrowFront" size={16} />
          </div>
          {CONFIG.features.zapPool && (
            <div className="settings-row" onClick={() => navigate("/zap-pool")}>
              <Icon name="piggy-bank" size={24} />
              <FormattedMessage defaultMessage="Zap Pool" />
              <Icon name="arrowFront" size={16} />
            </div>
          )}
          <div className="settings-row" onClick={handleLogout}>
            <Icon name="logout" size={24} />
            <FormattedMessage {...messages.LogOut} />
            <Icon name="arrowFront" size={16} />
          </div>
        </div>
      )}
      {!hideContent && (
        <div className="content">
          <Outlet />
        </div>
      )}
    </div>
  );
};

export default SettingsIndex;
