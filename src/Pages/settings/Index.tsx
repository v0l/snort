import { faCircleDollarToSlot, faGear, faPlug, faUser } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useNavigate } from "react-router-dom";
import "./Index.css";

const SettingsIndex = () => {
    const navigate = useNavigate();

    return (
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
        </div>
    )
}

export default SettingsIndex;