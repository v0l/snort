import { useNavigate } from "react-router-dom";
import Icon from "@/Icons/Icon";
import useKeyboardShortcut from "@/Hooks/useKeyboardShortcut";
import { isFormElement } from "@/SnortUtils";
import useLogin from "@/Hooks/useLogin";
import useEventPublisher from "@/Hooks/useEventPublisher";
import { HasNotificationsMarker } from "@/Pages/Layout/HasNotificationsMarker";
import NavLink from "@/Element/Button/NavLink";
import classNames from "classnames";
import { subscribeToNotifications } from "@/Notifications";

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

  if (!publicKey) {
    return (
      <button onClick={() => navigate("/login/sign-up")} className="mr-3 primary p-2">
        <Icon name="sign-in" size={20} className="md:hidden" />
      </button>
    );
  }

  return (
    <NavLink
      className={({ isActive }) => classNames({ active: isActive }, "px-2 py-3 flex")}
      to="/notifications"
      onClick={() => subscribeToNotifications(publisher)}>
      <Icon name="bell-solid" className="icon-solid" size={24} />
      <Icon name="bell-outline" className="icon-outline" size={24} />
      <HasNotificationsMarker />
    </NavLink>
  );
};

export default NotificationsHeader;
