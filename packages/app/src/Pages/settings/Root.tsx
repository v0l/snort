import "./Root.css";
import { useCallback, useEffect } from "react";
import { FormattedMessage } from "react-intl";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import Icon from "@/Icons/Icon";
import { LoginStore, logout } from "@/Login";
import useLogin from "@/Hooks/useLogin";
import { getCurrentSubscription } from "@/Subscription";
import usePageWidth from "@/Hooks/usePageWidth";
import messages from "./messages";

const SettingsIndex = () => {
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const pageWidth = usePageWidth();
  const sub = getCurrentSubscription(LoginStore.allSubscriptions());

  const handleLogout = useCallback(() => {
    logout(login.id);
    navigate("/");
  }, [login.id, navigate]);

  useEffect(() => {
    if (location.pathname === "/settings" && pageWidth >= 768) {
      navigate("/settings/profile", { replace: true });
    }
  }, [location, navigate, pageWidth]);

  const [hideMenu, hideContent] = [
    location.pathname !== "/settings" && pageWidth < 768,
    location.pathname === "/settings" && pageWidth < 768,
  ];

  const menuItems = [
    { icon: "profile", message: <FormattedMessage defaultMessage="Profile" id="itPgxd" />, path: "profile" },
    { icon: "relay", message: <FormattedMessage defaultMessage="Relays" id="RoOyAh" />, path: "relays" },
    { icon: "key", message: <FormattedMessage defaultMessage="Export Keys" id="08zn6O" />, path: "keys" },
    { icon: "shield-tick", message: <FormattedMessage defaultMessage="Moderation" id="wofVHy" />, path: "moderation" },
    { icon: "badge", message: <FormattedMessage defaultMessage="Nostr Address" id="9pMqYs" />, path: "handle" },
    { icon: "gear", message: <FormattedMessage defaultMessage="Preferences" id="PCSt5T" />, path: "preferences" },
    {
      icon: "bell-outline",
      message: <FormattedMessage defaultMessage="Notifications" id="NAidKb" />,
      path: "notifications",
    },
    { icon: "wallet", message: <FormattedMessage defaultMessage="Wallet" id="3yk8fB" />, path: "wallet" },
    { icon: "heart", message: <FormattedMessage defaultMessage="Donate" id="2IFGap" />, path: "/donate" },
    { icon: "hard-drive", message: <FormattedMessage defaultMessage="Cache" id="DBiVK1" />, path: "cache" },
    { icon: "link", message: <FormattedMessage defaultMessage="Invite" id="hYOE+U" />, path: "invite" },
  ];

  if (CONFIG.features.subscriptions) {
    menuItems.push({
      icon: "diamond",
      message: <FormattedMessage defaultMessage="Subscription" id="R/6nsx" />,
      path: "/subscribe/manage",
    });
  }

  if (CONFIG.features.zapPool) {
    menuItems.push({
      icon: "piggy-bank",
      message: <FormattedMessage defaultMessage="Zap Pool" id="i/dBAR" />,
      path: "/zap-pool",
    });
  }

  if (sub) {
    menuItems.push({
      icon: "code-circle",
      message: <FormattedMessage defaultMessage="Accounts" id="FvanT6" />,
      path: "accounts",
    });
  }

  const getNavLinkClass = ({ isActive }: { isActive: boolean }) => {
    return isActive ? "settings-row active" : "settings-row";
  };

  return (
    <div className="settings-nav">
      {!hideMenu && (
        <div>
          {menuItems.map(({ icon, message, path }) => (
            <NavLink to={path} key={path} className={getNavLinkClass} end>
              <Icon name={icon} size={24} />
              {message}
              <Icon name="arrowFront" size={16} />
            </NavLink>
          ))}
          <div className="settings-row" onClick={handleLogout}>
            <Icon name="logout" size={24} />
            <FormattedMessage {...messages.LogOut} />
            <Icon name="arrowFront" size={16} />
          </div>
        </div>
      )}
      {!hideContent && (
        <div className="content">
          <Outlet />
        </div>
      )}
    </div>
  );
};

export default SettingsIndex;
