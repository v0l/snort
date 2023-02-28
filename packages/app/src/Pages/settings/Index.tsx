import "./Index.css";
import { FormattedMessage } from "react-intl";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import ArrowFront from "Icons/ArrowFront";
import Gear from "Icons/Gear";
import Profile from "Icons/Profile";
import Relay from "Icons/Relay";
import Heart from "Icons/Heart";
import Logout from "Icons/Logout";
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
          <div className="mr10">
            <Profile />
          </div>
          <span>
            <FormattedMessage {...messages.Profile} />
          </span>
          <div className="align-end">
            <ArrowFront />
          </div>
        </div>
        <div className="settings-row" onClick={() => navigate("relays")}>
          <div className="mr10">
            <Relay />
          </div>
          <FormattedMessage {...messages.Relays} />
          <div className="align-end">
            <ArrowFront />
          </div>
        </div>
        <div className="settings-row" onClick={() => navigate("preferences")}>
          <div className="mr10">
            <Gear />
          </div>
          <FormattedMessage {...messages.Preferences} />
          <div className="align-end">
            <ArrowFront />
          </div>
        </div>
        <div className="settings-row" onClick={() => navigate("/donate")}>
          <div className="mr10">
            <Heart />
          </div>
          <FormattedMessage {...messages.Donate} />
          <div className="align-end">
            <ArrowFront />
          </div>
        </div>
        <div className="settings-row" onClick={handleLogout}>
          <div className="mr10">
            <Logout />
          </div>
          <FormattedMessage {...messages.LogOut} />
          <div className="align-end">
            <ArrowFront />
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsIndex;
