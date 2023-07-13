import "./Root.css";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";
import Icon from "Icons/Icon";
import { LoginStore, logout } from "Login";
import useLogin from "Hooks/useLogin";
import { unwrap } from "SnortUtils";
import { getCurrentSubscription } from "Subscription";
import { CollapsedSection } from "Element/Collapsed";

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
    <>
      <div className="settings-nav">
        <CollapsedSection
          title={
            <div className="flex">
              <Icon name="user" className="mr10" />
              <FormattedMessage defaultMessage="Account" />
            </div>
          }
          className="settings-group-header">
          <div className="card">
            <div className="settings-row inner" onClick={() => navigate("profile")}>
              <Icon name="profile" />
              <FormattedMessage {...messages.Profile} />
              <Icon name="arrowFront" />
            </div>
            <div className="settings-row inner" onClick={() => navigate("relays")}>
              <Icon name="relay" />
              <FormattedMessage {...messages.Relays} />
              <Icon name="arrowFront" />
            </div>
            <div className="settings-row inner" onClick={() => navigate("keys")}>
              <Icon name="key" />
              <FormattedMessage defaultMessage="Export Keys" />
              <Icon name="arrowFront" />
            </div>
            <div className="settings-row inner" onClick={() => navigate("handle")}>
              <Icon name="badge" />
              <FormattedMessage defaultMessage="Nostr Adddress" />
              <Icon name="arrowFront" />
            </div>
            <div className="settings-row inner" onClick={() => navigate("/subscribe/manage")}>
              <Icon name="diamond" />
              <FormattedMessage defaultMessage="Subscription" />
              <Icon name="arrowFront" />
            </div>
            {sub && (
              <div className="settings-row inner" onClick={() => navigate("accounts")}>
                <Icon name="code-circle" />
                <FormattedMessage defaultMessage="Account Switcher" />
                <Icon name="arrowFront" />
              </div>
            )}
          </div>
        </CollapsedSection>

        <div className="settings-row" onClick={() => navigate("preferences")}>
          <Icon name="gear" />
          <FormattedMessage {...messages.Preferences} />
          <Icon name="arrowFront" />
        </div>

        <div className="settings-row" onClick={() => navigate("wallet")}>
          <Icon name="wallet" />
          <FormattedMessage defaultMessage="Wallet" />
          <Icon name="arrowFront" />
        </div>
        <div className="settings-row" onClick={() => navigate("/donate")}>
          <Icon name="heart" />
          <FormattedMessage {...messages.Donate} />
          <Icon name="arrowFront" />
        </div>
        <div className="settings-row" onClick={() => navigate("/zap-pool")}>
          <Icon name="piggy-bank" />
          <FormattedMessage defaultMessage="Zap Pool" />
          <Icon name="arrowFront" />
        </div>
        <div className="settings-row" onClick={handleLogout}>
          <Icon name="logout" />
          <FormattedMessage {...messages.LogOut} />
          <Icon name="arrowFront" />
        </div>
      </div>
    </>
  );
};

export default SettingsIndex;
