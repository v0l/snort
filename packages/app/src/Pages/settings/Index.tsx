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
    dispatch(logout());
    window.location.href = "/";
  }

  return (
    <>
      <div className="settings-nav">
        <div className="settings-row" onClick={() => navigate("profile")}>
          <Icon name="profile" className="mr10" />
          <span>
            <FormattedMessage {...messages.Profile} />
          </span>
          <div className="align-end">
            <Icon name="arrowFront" />
          </div>
        </div>
        <div className="settings-row" onClick={() => navigate("relays")}>
          <Icon name="relay" className="mr10" />
          <FormattedMessage {...messages.Relays} />
          <div className="align-end">
            <Icon name="arrowFront" />
          </div>
        </div>
        <div className="settings-row" onClick={() => navigate("preferences")}>
          <Icon name="gear" className="mr10" />
          <FormattedMessage {...messages.Preferences} />
          <div className="align-end">
            <Icon name="arrowFront" />
          </div>
        </div>
        <div className="settings-row" onClick={() => navigate("/donate")}>
          <Icon name="heart" className="mr10" />
          <FormattedMessage {...messages.Donate} />
          <div className="align-end">
            <Icon name="arrowFront" />
          </div>
        </div>
        <div className="settings-row" onClick={handleLogout}>
          <Icon name="logout" className="mr10" />
          <FormattedMessage {...messages.LogOut} />
          <div className="align-end">
            <Icon name="arrowFront" />
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsIndex;
