import "./Layout.css";
import { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux";
import { Outlet, useNavigate } from "react-router-dom";
import { faBell, faMessage } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { System } from "../nostr/System"
import ProfileImage from "../element/ProfileImage";
import { init } from "../state/Login";
import useLoginFeed from "../feed/LoginFeed";

export default function Layout(props) {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const isInit = useSelector(s => s.login.loggedOut);
    const key = useSelector(s => s.login.publicKey);
    const relays = useSelector(s => s.login.relays);
    const notifications = useSelector(s => s.login.notifications);
    const readNotifications = useSelector(s => s.login.readNotifications);
    useLoginFeed();

    useEffect(() => {
        if (relays) {
            for (let [k, v] of Object.entries(relays)) {
                System.ConnectToRelay(k, v);
            }
            for (let [k, v] of System.Sockets) {
                if (!relays[k]) {
                    System.DisconnectRelay(k);
                }
            }
        }
    }, [relays]);

    useEffect(() => {
        dispatch(init());
    }, []);

    async function goToNotifications(e) {
        e.stopPropagation();
        // request permissions to send notifications
        if ("Notification" in window && Notification.permission !== "granted") {
            try {
                let res = await Notification.requestPermission();
                console.debug(res);
            } catch (e) {
                console.error(e);
            }
        }
        navigate("/notifications");
    }

    function accountHeader() {
        const unreadNotifications = notifications?.filter(a => (a.created_at * 1000) > readNotifications).length;
        return (
            <>
                <div className="btn btn-rnd mr10" onClick={(e) => navigate("/messages")}>
                    <FontAwesomeIcon icon={faMessage} size="xl" />
                </div>
                <div className={`btn btn-rnd${unreadNotifications === 0 ? " mr10" : ""}`} onClick={(e) => goToNotifications(e)}>
                    <FontAwesomeIcon icon={faBell} size="xl" />
                </div>
                {unreadNotifications > 0 && (<span className="unread-count">
                    {unreadNotifications > 100 ? ">99" : unreadNotifications}
                </span>)}
                <ProfileImage pubkey={key} showUsername={false} />
            </>
        )
    }

    if (typeof isInit !== "boolean") {
        return null;
    }

    return (
        <div className="page">
            <div className="header">
                <div onClick={() => navigate("/")}>snort</div>
                <div>
                    {key ? accountHeader() :
                        <div className="btn" onClick={() => navigate("/login")}>Login</div>
                    }
                </div>
            </div>

            <Outlet/>
        </div>
    )
}