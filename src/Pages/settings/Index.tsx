import "./Index.css";

import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { faRightFromBracket, faCircleDollarToSlot, faGear, faPlug, faUser } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { logout } from "State/Login";

const SettingsIndex = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    function handleLogout() {
      dispatch(logout())
      navigate("/")
    }

    return (
      <>
        <div className="settings-nav">
            <div className="card" onClick={() => navigate("profile")}>
                <FontAwesomeIcon icon={faUser} size="xl" className="mr10" />
                Profile
            </div>
            <div className="card" onClick={() => navigate("relays")}>
                <FontAwesomeIcon icon={faPlug} size="xl" className="mr10" />
                Relays
            </div>
            <div className="card" onClick={() => navigate("preferences")}>
                <FontAwesomeIcon icon={faGear} size="xl" className="mr10" />
                Preferences
            </div>
            <div className="card" onClick={() => navigate("/donate")}>
                <FontAwesomeIcon icon={faCircleDollarToSlot} size="xl" className="mr10" />
                Donate
            </div>
            <div className="card" onClick={handleLogout}>
                <FontAwesomeIcon icon={faRightFromBracket} size="xl" className="mr10" />
                Log Out
            </div>
        </div>
      </>
    )
}

export default SettingsIndex;