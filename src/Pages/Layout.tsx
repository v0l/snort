import "./Layout.css";
import { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux";
import { Outlet, useNavigate } from "react-router-dom";
import Envelope from "Icons/Envelope";
import Bell from "Icons/Bell";
import Search from "Icons/Search";

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
import useModeration from "Hooks/useModeration";


export default function Layout() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const isInit = useSelector<RootState, boolean | undefined>(s => s.login.loggedOut);
    const key = useSelector<RootState, HexKey | undefined>(s => s.login.publicKey);
    const relays = useSelector<RootState, Record<string, RelaySettings>>(s => s.login.relays);
    const notifications = useSelector<RootState, TaggedRawEvent[]>(s => s.login.notifications);
    const readNotifications = useSelector<RootState, number>(s => s.login.readNotifications);
    const dms = useSelector<RootState, RawEvent[]>(s => s.login.dms);
    const { isMuted } = useModeration();
    const filteredDms = dms.filter(a => !isMuted(a.pubkey))
    const prefs = useSelector<RootState, UserPreferences>(s => s.login.preferences);
    const pub = useEventPublisher();
    useLoginFeed();

    useEffect(() => {
        System.nip42Auth = pub.nip42Auth
    },[pub])

    useEffect(() => {
        if (relays) {
            for (let [k, v] of Object.entries(relays)) {
                System.ConnectToRelay(k, v);
            }
            for (let [k, v] of System.Sockets) {
                if (!relays[k] && !SearchRelays.has(k)) {
                    System.DisconnectRelay(k);
                }
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
        const unreadDms = key ? totalUnread(filteredDms, key) : 0;
        return (
            <div className="header-actions">
                <div className="btn btn-rnd" onClick={(e) => navigate("/search")}>
                    <Search />
                </div>
                <div className="btn btn-rnd" onClick={(e) => navigate("/messages")}>
                    <Envelope />
                    {unreadDms > 0 && (<span className="has-unread"></span>)}
                </div>
                <div className="btn btn-rnd" onClick={(e) => goToNotifications(e)}>
                    <Bell />
                    {unreadNotifications > 0 && (<span className="has-unread"></span>)}
                </div>
                <ProfileImage pubkey={key || ""} showUsername={false} />
            </div>
        )
    }

    if (typeof isInit !== "boolean") {
        return null;
    }
    return (
        <div className="page">
            <header>
                <div className="logo" onClick={() => navigate("/")}>Snort</div>
                <div>
                    {key ? accountHeader() :
                        <button type="button" onClick={() => navigate("/login")}>Login</button>
                    }
                </div>
            </header>

            <Outlet />
        </div>
    )
}
