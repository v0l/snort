import "./Layout.css";
import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { FormattedMessage } from "react-intl";
import { useUserProfile } from "@snort/system-react";

import messages from "./messages";

import Icon from "Icons/Icon";
import useLoginFeed from "Feed/LoginFeed";
import { mapPlanName } from "./subscribe";
import useLogin from "Hooks/useLogin";
import Avatar from "Element/User/Avatar";
import { isHalloween, isFormElement, isStPatricksDay, isChristmas } from "SnortUtils";
import { getCurrentSubscription } from "Subscription";
import Toaster from "Toaster";
import { useTheme } from "Hooks/useTheme";
import { useLoginRelays } from "Hooks/useLoginRelays";
import { LoginUnlock } from "Element/PinPrompt";
import useKeyboardShortcut from "Hooks/useKeyboardShortcut";
import { LoginStore } from "Login";
import { NoteCreatorButton } from "Element/Event/NoteCreatorButton";
import { ProfileLink } from "Element/User/ProfileLink";
import SearchBox from "../Element/SearchBox";
import SnortApi from "External/SnortApi";
import useEventPublisher from "Hooks/useEventPublisher";
import { base64 } from "@scure/base";
import { unwrap } from "@snort/shared";

export default function Layout() {
  const location = useLocation();
  const [pageClass, setPageClass] = useState("page");
  const { id, stalker } = useLogin(s => ({ id: s.id, stalker: s.stalker ?? false }));

  useLoginFeed();
  useTheme();
  useLoginRelays();
  useKeyboardShortcut(".", event => {
    // if event happened in a form element, do nothing, otherwise focus on search input
    if (event.target && !isFormElement(event.target as HTMLElement)) {
      event.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  });

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
    <>
      <div className={pageClass}>
        {!shouldHideHeader && (
          <header className="main-content">
            <LogoHeader />
            <AccountHeader />
          </header>
        )}
        <Outlet />
        <NoteCreatorButton className="note-create-button" />
        <Toaster />
      </div>
      <LoginUnlock />
      {stalker && (
        <div
          className="stalker"
          onClick={() => {
            LoginStore.removeSession(id);
          }}>
          <button type="button" className="circle flex items-center">
            <Icon name="close" />
          </button>
        </div>
      )}
    </>
  );
}

const AccountHeader = () => {
  const navigate = useNavigate();

  useKeyboardShortcut("/", event => {
    // if event happened in a form element, do nothing, otherwise focus on search input
    if (event.target && !isFormElement(event.target as HTMLElement)) {
      event.preventDefault();
      document.querySelector<HTMLInputElement>(".search input")?.focus();
    }
  });

  const { publicKey, latestNotification, readNotifications, readonly } = useLogin(s => ({
    publicKey: s.publicKey,
    latestNotification: s.latestNotification,
    readNotifications: s.readNotifications,
    readonly: s.readonly,
  }));
  const profile = useUserProfile(publicKey);
  const { publisher } = useEventPublisher();

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
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && publisher) {
          const api = new SnortApi(undefined, publisher);
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: (await api.getPushNotificationInfo()).publicKey,
          });
          await api.registerPushNotifications({
            endpoint: sub.endpoint,
            p256dh: base64.encode(new Uint8Array(unwrap(sub.getKey("p256dh")))),
            auth: base64.encode(new Uint8Array(unwrap(sub.getKey("auth")))),
            scope: `${location.protocol}//${location.hostname}`,
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (!publicKey) {
    return (
      <button type="button" onClick={() => navigate("/login")}>
        <FormattedMessage {...messages.Login} />
      </button>
    );
  }
  return (
    <div className="header-actions">
      {!location.pathname.startsWith("/search") ? <SearchBox /> : <div className="grow"></div>}
      {!readonly && (
        <Link className="btn" to="/messages">
          <Icon name="mail" size={24} />
          {unreadDms > 0 && <span className="has-unread"></span>}
        </Link>
      )}
      <Link className="btn" to="/notifications" onClick={goToNotifications}>
        <Icon name="bell-02" size={24} />
        {hasNotifications && <span className="has-unread"></span>}
      </Link>
      <ProfileLink pubkey={publicKey} user={profile}>
        <Avatar pubkey={publicKey} user={profile} />
      </ProfileLink>
    </div>
  );
};

function LogoHeader() {
  const { subscriptions } = useLogin();
  const currentSubscription = getCurrentSubscription(subscriptions);

  const extra = () => {
    if (isHalloween()) return "🎃";
    if (isStPatricksDay()) return "🍀";
    if (isChristmas()) return "🎄";
  };

  return (
    <Link to="/" className="logo">
      <h1>
        {extra()}
        {CONFIG.appName}
      </h1>
      {currentSubscription && (
        <div className="flex items-center g4 text-sm font-semibold tracking-wider">
          <Icon name="diamond" size={16} className="text-pro" />
          {mapPlanName(currentSubscription.type)}
        </div>
      )}
    </Link>
  );
}
