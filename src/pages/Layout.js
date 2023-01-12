import "./Layout.css";
import { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux";
import { Outlet, useNavigate } from "react-router-dom";
import { faBell } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { System } from ".."
import ProfileImage from "../element/ProfileImage";
import { init } from "../state/Login";
import useLoginFeed from "../feed/LoginFeed";
import useUsersCache from "../feed/UsersFeed";

export default function Layout(props) {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const isInit = useSelector(s => s.login.loggedOut);
    const key = useSelector(s => s.login.publicKey);
    const relays = useSelector(s => s.login.relays);
    const notifications = useSelector(s => s.login.notifications);
    const readNotifications = useSelector(s => s.login.readNotifications);
    useUsersCache();
    useLoginFeed();

    useEffect(() => {
        if (relays) {
            for (let [k, v] of Object.entries(relays)) {
                System.ConnectToRelay(k, v);
            }
            for (let [k, v] of Object.entries(System.Sockets)) {
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
                <div className="btn btn-rnd notifications" onClick={(e) => goToNotifications(e)}>
                    <FontAwesomeIcon icon={faBell} size="xl" />
                    {unreadNotifications !== 0 && (
                      <span className="unread-count">
                        {unreadNotifications}
                      </span>
                    )}
                </div>
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