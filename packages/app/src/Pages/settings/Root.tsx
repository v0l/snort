import "./Root.css";
import { FormattedMessage } from "react-intl";
import { Outlet, useNavigate } from "react-router-dom";
import Icon from "Icons/Icon";
import { LoginStore, logout } from "Login";
import useLogin from "Hooks/useLogin";
import { unwrap } from "SnortUtils";
import { getCurrentSubscription } from "Subscription";

import messages from "./messages";

const SettingsIndex = () => {
  const login = useLogin();
  const navigate = useNavigate();
  const sub = getCurrentSubscription(LoginStore.allSubscriptions());

  function handleLogout() {
    logout(unwrap(login.publicKey));
    navigate("/");
  }

  return (
    <div className="settings-nav">
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
        <div className="settings-row" onClick={() => navigate("handle")}>
          <Icon name="badge" size={24} />
          <FormattedMessage defaultMessage="Nostr Adddress" />
          <Icon name="arrowFront" size={16} />
        </div>
        <div className="settings-row" onClick={() => navigate("/subscribe/manage")}>
          <Icon name="diamond" size={24} />
          <FormattedMessage defaultMessage="Subscription" />
          <Icon name="arrowFront" size={16} />
        </div>
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
        <div className="settings-row" onClick={() => navigate("/zap-pool")}>
          <Icon name="piggy-bank" size={24} />
          <FormattedMessage defaultMessage="Zap Pool" />
          <Icon name="arrowFront" size={16} />
        </div>
        <div className="settings-row" onClick={handleLogout}>
          <Icon name="logout" size={24} />
          <FormattedMessage {...messages.LogOut} />
          <Icon name="arrowFront" size={16} />
        </div>
      </div>
      <div>
        <Outlet />
      </div>
    </div>
  );
};

export default SettingsIndex;
