import { useNavigate } from "react-router-dom";
import { base64 } from "@scure/base";
import { unwrap } from "@snort/shared";
import Icon from "@/Icons/Icon";
import useKeyboardShortcut from "@/Hooks/useKeyboardShortcut";
import { isFormElement } from "@/SnortUtils";
import useLogin from "@/Hooks/useLogin";
import useEventPublisher from "@/Hooks/useEventPublisher";
import SnortApi from "@/External/SnortApi";
import { HasNotificationsMarker } from "@/Pages/Layout/HasNotificationsMarker";
import NavLink from "@/Element/Button/NavLink";

const NotificationsHeader = () => {
  const navigate = useNavigate();

  useKeyboardShortcut("/", event => {
    // if event happened in a form element, do nothing, otherwise focus on search input
    if (event.target && !isFormElement(event.target as HTMLElement)) {
      event.preventDefault();
      document.querySelector<HTMLInputElement>(".search input")?.focus();
    }
  });

  const { publicKey } = useLogin(s => ({
    publicKey: s.publicKey,
  }));
  const { publisher } = useEventPublisher();

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
      <button onClick={() => navigate("/login/sign-up")} className="mr-3 primary p-2">
        <Icon name="sign-in" size={20} className="md:hidden" />
      </button>
    );
  }

  return (
    <div className="flex justify-between">
      <NavLink className="btn" to="/notifications" onClick={goToNotifications}>
        <Icon name="bell-02" size={24} />
        <HasNotificationsMarker />
      </NavLink>
    </div>
  );
};

export default NotificationsHeader;
