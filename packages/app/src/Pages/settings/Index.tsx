import "./Index.css";
import { FormattedMessage } from "react-intl";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import Icon from "Icons/Icon";
import { logout } from "State/Login";

import messages from "./messages";

const SettingsIndex = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  function handleLogout() {
    dispatch(
      logout(() => {
        navigate("/");
      })
    );
  }

  return (
    <>
      <div className="settings-nav">
        <div className="settings-row" onClick={() => navigate("profile")}>
          <Icon name="profile" />
          <FormattedMessage {...messages.Profile} />
          <Icon name="arrowFront" />
        </div>
        <div className="settings-row" onClick={() => navigate("relays")}>
          <Icon name="relay" />
          <FormattedMessage {...messages.Relays} />
          <Icon name="arrowFront" />
        </div>
        <div className="settings-row" onClick={() => navigate("preferences")}>
          <Icon name="gear" />
          <FormattedMessage {...messages.Preferences} />
          <Icon name="arrowFront" />
        </div>
        <div className="settings-row" onClick={() => navigate("wallet")}>
          <Icon name="bitcoin" />
          <FormattedMessage defaultMessage="Wallet" />
          <Icon name="arrowFront" />
        </div>
        <div className="settings-row" onClick={() => navigate("/donate")}>
          <Icon name="heart" />
          <FormattedMessage {...messages.Donate} />
          <Icon name="arrowFront" />
        </div>
        <div className="settings-row" onClick={() => navigate("handle")}>
          <Icon name="badge" />
          <FormattedMessage defaultMessage="Manage Nostr Adddress (NIP-05)" />
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
