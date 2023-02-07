import "./Index.css";

import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import ArrowFront from "Icons/ArrowFront";
import Gear from "Icons/Gear";
import Profile from "Icons/Profile";
import Relay from "Icons/Relay";
import Heart from "Icons/Heart";
import Logout from "Icons/Logout";

import { logout } from "State/Login";

const SettingsIndex = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  function handleLogout() {
    dispatch(logout());
    navigate("/");
  }

  return (
    <>
      <div className="settings-nav">
        <div className="settings-row" onClick={() => navigate("profile")}>
          <div className="mr10">
            <Profile />
          </div>
          <span>Profile</span>
          <div className="align-end">
            <ArrowFront />
          </div>
        </div>
        <div className="settings-row" onClick={() => navigate("relays")}>
          <div className="mr10">
            <Relay />
          </div>
          Relays
          <div className="align-end">
            <ArrowFront />
          </div>
        </div>
        <div className="settings-row" onClick={() => navigate("preferences")}>
          <div className="mr10">
            <Gear />
          </div>
          Preferences
          <div className="align-end">
            <ArrowFront />
          </div>
        </div>
        <div className="settings-row" onClick={() => navigate("/donate")}>
          <div className="mr10">
            <Heart />
          </div>
          Donate
          <div className="align-end">
            <ArrowFront />
          </div>
        </div>
        <div className="settings-row" onClick={handleLogout}>
          <div className="mr10">
            <Logout />
          </div>
          Log Out
          <div className="align-end">
            <ArrowFront />
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsIndex;
