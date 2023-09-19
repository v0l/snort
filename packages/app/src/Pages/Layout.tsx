import "./Layout.css";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { FormattedMessage, useIntl } from "react-intl";
import { useUserProfile } from "@snort/system-react";
import { NostrLink, NostrPrefix, tryParseNostrLink } from "@snort/system";

import messages from "./messages";

import Icon from "Icons/Icon";
import { RootState } from "State/Store";
import { setShow, reset } from "State/NoteCreator";
import useLoginFeed from "Feed/LoginFeed";
import { NoteCreator } from "Element/NoteCreator";
import { mapPlanName } from "./subscribe";
import useLogin from "Hooks/useLogin";
import Avatar from "Element/Avatar";
import { profileLink } from "SnortUtils";
import { getCurrentSubscription } from "Subscription";
import Toaster from "Toaster";
import Spinner from "Icons/Spinner";
import { fetchNip05Pubkey } from "Nip05/Verifier";
import { useTheme } from "Hooks/useTheme";
import { useLoginRelays } from "Hooks/useLoginRelays";

export default function Layout() {
  const location = useLocation();
  const replyTo = useSelector((s: RootState) => s.noteCreator.replyTo);
  const isNoteCreatorShowing = useSelector((s: RootState) => s.noteCreator.show);
  const isReplyNoteCreatorShowing = replyTo && isNoteCreatorShowing;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { publicKey, subscriptions } = useLogin();
  const currentSubscription = getCurrentSubscription(subscriptions);
  const [pageClass, setPageClass] = useState("page");

  useLoginFeed();
  useTheme();
  useLoginRelays();

  const handleNoteCreatorButtonClick = () => {
    if (replyTo) {
      dispatch(reset());
    }
    dispatch(setShow(true));
  };

  const shouldHideNoteCreator = useMemo(() => {
    const hideOn = ["/settings", "/messages", "/new", "/login", "/donate", "/e", "/subscribe"];
    return isReplyNoteCreatorShowing || hideOn.some(a => location.pathname.startsWith(a));
  }, [location, isReplyNoteCreatorShowing]);

  const shouldHideHeader = useMemo(() => {
    const hideOn = ["/login", "/new"];
    return hideOn.some(a => location.pathname.startsWith(a));
  }, [location]);

  useEffect(() => {
    const widePage = ["/login", "/messages"];
    const noScroll = ["/messages"];
    if (widePage.some(a => location.pathname.startsWith(a))) {
      setPageClass(noScroll.some(a => location.pathname.startsWith(a)) ? "scroll-lock" : "");
    } else {
      setPageClass("page");
    }
  }, [location]);

  return (
    <div className={pageClass}>
      {!shouldHideHeader && (
        <header className="main-content">
          <Link to="/" className="logo">
            <h1>Snort</h1>
            {currentSubscription && (
              <small className="flex">
                <Icon name="diamond" size={10} className="mr5" />
                {mapPlanName(currentSubscription.type)}
              </small>
            )}
          </Link>

          {publicKey ? (
            <AccountHeader />
          ) : (
            <button type="button" onClick={() => navigate("/login")}>
              <FormattedMessage {...messages.Login} />
            </button>
          )}
        </header>
      )}
      <Outlet />

      {!shouldHideNoteCreator && (
        <>
          <button className="primary note-create-button" onClick={handleNoteCreatorButtonClick}>
            <Icon name="plus" size={16} />
          </button>
          <NoteCreator />
        </>
      )}
      <Toaster />
    </div>
  );
}

const AccountHeader = () => {
  const navigate = useNavigate();
  const { formatMessage } = useIntl();

  const { publicKey, latestNotification, readNotifications } = useLogin();
  const profile = useUserProfile(publicKey);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);

  async function searchThing() {
    try {
      setSearching(true);
      const link = tryParseNostrLink(search);
      if (link) {
        navigate(`/${link.encode()}`);
        return;
      }
      if (search.includes("@")) {
        const [handle, domain] = search.split("@");
        const pk = await fetchNip05Pubkey(handle, domain);
        if (pk) {
          navigate(`/${new NostrLink(NostrPrefix.PublicKey, pk).encode()}`);
          return;
        }
      }
      navigate(`/search/${encodeURIComponent(search)}`);
    } finally {
      setSearch("");
      setSearching(false);
    }
  }

  const hasNotifications = useMemo(
    () => latestNotification > readNotifications,
    [latestNotification, readNotifications],
  );
  const unreadDms = useMemo(() => (publicKey ? 0 : 0), [publicKey]);

  async function goToNotifications() {
    // request permissions to send notifications
    if ("Notification" in window) {
      try {
        if (Notification.permission !== "granted") {
          const res = await Notification.requestPermission();
          console.debug(res);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }

  return (
    <div className="header-actions">
      {!location.pathname.startsWith("/search") && (
        <div className="search">
          <input
            type="text"
            placeholder={formatMessage({ defaultMessage: "Search" })}
            className="w-max"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={async e => {
              if (e.key === "Enter") {
                await searchThing();
              }
            }}
          />
          {searching ? (
            <Spinner width={24} height={24} />
          ) : (
            <Icon name="search" size={24} onClick={() => navigate("/search")} />
          )}
        </div>
      )}
      <Link className="btn" to="/messages">
        <Icon name="mail" size={24} />
        {unreadDms > 0 && <span className="has-unread"></span>}
      </Link>
      <Link className="btn" to="/notifications" onClick={goToNotifications}>
        <Icon name="bell-02" size={24} />
        {hasNotifications && <span className="has-unread"></span>}
      </Link>
      <Avatar
        pubkey={publicKey ?? ""}
        user={profile}
        onClick={() => {
          if (profile) {
            navigate(profileLink(profile.pubkey));
          }
        }}
      />
    </div>
  );
};
