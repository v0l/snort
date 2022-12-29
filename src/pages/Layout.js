import "./Layout.css";
import { useContext, useEffect } from "react"
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { faBell } from "@fortawesome/free-solid-svg-icons";

import { NostrContext } from ".."
import ProfileImage from "../element/ProfileImage";
import { init } from "../state/Login";
import useLoginFeed from "../feed/LoginFeed";
import useUsersCache from "../feed/UsersFeed";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function Layout(props) {
    const dispatch = useDispatch();
    const system = useContext(NostrContext);
    const navigate = useNavigate();
    const key = useSelector(s => s.login.publicKey);
    const relays = useSelector(s => s.login.relays);
    useUsersCache();
    useLoginFeed();

    useEffect(() => {
        if (system && relays) {
            for (let [k, v] of Object.entries(relays)) {
                system.ConnectToRelay(k, v);
            }
        }
    }, [relays, system]);

    useEffect(() => {
        dispatch(init());
    }, []);

    function accountHeader() {
        return (
            <>
                <div className="btn btn-rnd notifications">
                    <FontAwesomeIcon icon={faBell} size="xl" />
                </div>
                <ProfileImage pubKey={key} />
            </>
        )
    }

    return (
        <div className="page">
            <div className="header">
                <div onClick={() => navigate("/")}>n o s t r</div>
                <div>
                    {key ? accountHeader() :
                        <div className="btn" onClick={() => navigate("/login")}>Login</div>
                    }
                </div>
            </div>

            {props.children}
        </div>
    )
}