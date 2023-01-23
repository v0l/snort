import "./Layout.css";
import { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux";
import { Outlet, useNavigate } from "react-router-dom";
import { faBell, faMessage, faSearch } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { RootState } from "State/Store";
import { init, UserPreferences } from "State/Login";
import { HexKey, RawEvent, TaggedRawEvent } from "Nostr";
import { RelaySettings } from "Nostr/Connection";
import { System } from "Nostr/System"
import ProfileImage from "Element/ProfileImage";
import useLoginFeed from "Feed/LoginFeed";
import { totalUnread } from "Pages/MessagesPage";
import { SearchRelays } from 'Const';
import useEventPublisher from "Feed/EventPublisher";
import { NIP42AuthChallenge, NIP42AuthResponse } from "Nostr/Auth";

export default function Layout() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const isInit = useSelector<RootState, boolean | undefined>(s => s.login.loggedOut);
    const key = useSelector<RootState, HexKey | undefined>(s => s.login.publicKey);
    const relays = useSelector<RootState, Record<string, RelaySettings>>(s => s.login.relays);
    const notifications = useSelector<RootState, TaggedRawEvent[]>(s => s.login.notifications);
    const readNotifications = useSelector<RootState, number>(s => s.login.readNotifications);
    const dms = useSelector<RootState, RawEvent[]>(s => s.login.dms);
    const prefs = useSelector<RootState, UserPreferences>(s => s.login.preferences);
    const pub = useEventPublisher();
    useLoginFeed();

    useEffect(() => {
        if (relays) {
            const nip42AuthEvent = async (event: NIP42AuthChallenge) => {
                if(event.challenge && event.relay) {
                    const signedEvent = await pub.nip42Auth(event.challenge, event.relay);
                    const response = new NIP42AuthResponse(event.challenge, signedEvent);
                    window.dispatchEvent(response);
                }
            }
            window.addEventListener("nip42auth", nip42AuthEvent)

            for (let [k, v] of Object.entries(relays)) {
                System.ConnectToRelay(k, v);
            }
            for (let [k, v] of System.Sockets) {
                if (!relays[k] && !SearchRelays.has(k)) {
                    System.DisconnectRelay(k);
                }
            }

            return () => {
                window.removeEventListener("nip42auth", nip42AuthEvent)
            }
        }
    }, [relays]);

    function setTheme(theme: "light" | "dark") {
        const elm = document.documentElement;
        if (theme === "light" && !elm.classList.contains("light")) {
            elm.classList.add("light");
        } else if (theme === "dark" && elm.classList.contains("light")) {
            elm.classList.remove("light");
        }
    }

    useEffect(() => {
        let osTheme = window.matchMedia("(prefers-color-scheme: light)");
        setTheme(prefs.theme === "system" && osTheme.matches ? "light" : prefs.theme === "light" ? "light" : "dark");

        osTheme.onchange = (e) => {
            if (prefs.theme === "system") {
                setTheme(e.matches ? "light" : "dark");
            }
        }
        return () => { osTheme.onchange = null; }
    }, [prefs.theme]);

    useEffect(() => {
        dispatch(init());
    }, []);

    async function goToNotifications(e: any) {
        e.stopPropagation();
        // request permissions to send notifications
        if ("Notification" in window) {
            try {
                if (Notification.permission !== "granted") {
                    let res = await Notification.requestPermission();
                    console.debug(res);
                }
            } catch (e) {
                console.error(e);
            }
        }
        navigate("/notifications");
    }

    function accountHeader() {
        const unreadNotifications = notifications?.filter(a => (a.created_at * 1000) > readNotifications).length;
        const unreadDms = key ? totalUnread(dms, key) : 0;
        return (
            <>
                <div className={`btn btn-rnd${unreadDms === 0 ? " mr10" : ""}`} onClick={(e) => navigate("/messages")}>
                    <FontAwesomeIcon icon={faMessage} size="xl" />
                </div>
                {unreadDms > 0 && (<span className="unread-count">
                    {unreadDms > 100 ? ">99" : unreadDms}
                </span>)}
                <div className={`btn btn-rnd${unreadNotifications === 0 ? " mr10" : ""}`} onClick={(e) => goToNotifications(e)}>
                    <FontAwesomeIcon icon={faBell} size="xl" />
                </div>
                {unreadNotifications > 0 && (<span className="unread-count">
                    {unreadNotifications > 100 ? ">99" : unreadNotifications}
                </span>)}
                <ProfileImage pubkey={key || ""} showUsername={false} />
            </>
        )
    }

    if (typeof isInit !== "boolean") {
        return null;
    }
    return (
        <div className="page">
            <div className="header">
                <div className="logo" onClick={() => navigate("/")}>snort</div>
                <div>
                    <div className={`btn btn-rnd mr10`} onClick={(e) => navigate("/search")}>
                        <FontAwesomeIcon icon={faSearch} size="xl" />
                    </div>
                    {key ? accountHeader() :
                        <div className="btn" onClick={() => navigate("/login")}>Login</div>
                    }
                </div>
            </div>

            <Outlet />
        </div>
    )
}
