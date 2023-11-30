import { Link, useNavigate } from "react-router-dom";
import { useUserProfile } from "@snort/system-react";
import { useMemo, useSyncExternalStore } from "react";
import { base64 } from "@scure/base";
import { unwrap } from "@snort/shared";
import { FormattedMessage, useIntl } from "react-intl";
import SearchBox from "@/Element/SearchBox";
import { ProfileLink } from "@/Element/User/ProfileLink";
import Avatar from "@/Element/User/Avatar";
import Icon from "@/Icons/Icon";
import useKeyboardShortcut from "@/Hooks/useKeyboardShortcut";
import { isFormElement } from "@/SnortUtils";
import useLogin from "@/Hooks/useLogin";
import useEventPublisher from "@/Hooks/useEventPublisher";
import SnortApi from "@/External/SnortApi";
import { Notifications } from "@/Cache";

const AccountHeader = () => {
  const navigate = useNavigate();
  const { formatMessage } = useIntl();

  useKeyboardShortcut("/", event => {
    // if event happened in a form element, do nothing, otherwise focus on search input
    if (event.target && !isFormElement(event.target as HTMLElement)) {
      event.preventDefault();
      document.querySelector<HTMLInputElement>(".search input")?.focus();
    }
  });

  const { publicKey, readonly } = useLogin(s => ({
    publicKey: s.publicKey,
    readonly: s.readonly,
  }));
  const profile = useUserProfile(publicKey);
  const { publisher } = useEventPublisher();

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
      <button type="button" onClick={() => navigate("/login/sign-up")}>
        <FormattedMessage defaultMessage="Sign Up" id="39AHJm" />
      </button>
    );
  }

  const readOnlyIcon = readonly && (
    <span style={{ transform: "rotate(135deg)" }} title={formatMessage({ defaultMessage: "Read-only", id: "djNL6D" })}>
      <Icon name="openeye" className="text-nostr-red" size={20} />
    </span>
  );

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
        <HasNotificationsMarker />
      </Link>
      <ProfileLink pubkey={publicKey} user={profile}>
        <Avatar pubkey={publicKey} user={profile} icons={readOnlyIcon} />
      </ProfileLink>
    </div>
  );
};

export function HasNotificationsMarker() {
  const readNotifications = useLogin(s => s.readNotifications);
  const notifications = useSyncExternalStore(
    c => Notifications.hook(c, "*"),
    () => Notifications.snapshot(),
  );
  const latestNotification = useMemo(
    () => notifications.reduce((acc, v) => (v.created_at > acc ? v.created_at : acc), 0),
    [notifications],
  );
  const hasNotifications = useMemo(
    () => latestNotification * 1000 > readNotifications,
    [notifications, readNotifications],
  );

  if (hasNotifications) {
    return (
      <div className="relative">
        <span className="has-unread absolute top-0 right-0 rounded-full"></span>
      </div>
    );
  }
}

export default AccountHeader;
