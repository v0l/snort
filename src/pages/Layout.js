import "./Layout.css";
import { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { faBell } from "@fortawesome/free-solid-svg-icons";

import { System } from ".."
import ProfileImage from "../element/ProfileImage";
import { init } from "../state/Login";
import useLoginFeed from "../feed/LoginFeed";
import useUsersCache from "../feed/UsersFeed";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function Layout(props) {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const key = useSelector(s => s.login.publicKey);
    const relays = useSelector(s => s.login.relays);
    const notifications = useSelector(s => s.login.notifications);
    useUsersCache();
    useLoginFeed();

    useEffect(() => {
        if (relays) {
            for (let [k, v] of Object.entries(relays)) {
                System.ConnectToRelay(k, v);
            }
        }
    }, [relays]);

    useEffect(() => {
        dispatch(init());
    }, []);

    function accountHeader() {
        return (
            <>
                <div className="btn btn-rnd notifications" onClick={() => navigate("/notifications")}>
                    <FontAwesomeIcon icon={faBell} size="xl" />
                    {notifications?.length ?? 0}
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