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
    { icon: "profile", message: messages.Profile, path: "profile" },
    { icon: "relay", message: messages.Relays, path: "relays" },
    { icon: "key", message: "Export Keys", id: "08zn6O", path: "keys" },
    { icon: "shield-tick", message: "Moderation", id: "wofVHy", path: "moderation" },
    { icon: "badge", message: "Nostr Address", id: "9pMqYs", path: "handle" },
    { icon: "gear", message: messages.Preferences, path: "preferences" },
    { icon: "wallet", message: "Wallet", id: "3yk8fB", path: "wallet" },
    { icon: "heart", message: messages.Donate, path: "/donate" },
    { icon: "hard-drive", message: "Cache", id: "DBiVK1", path: "cache" },
    { icon: "profile", message: messages.SocialGraph, path: "/graph" },
  ];

  if (CONFIG.features.subscriptions) {
    menuItems.push({ icon: "diamond", message: "Subscription", id: "R/6nsx", path: "/subscribe/manage" });
  }

  if (CONFIG.features.zapPool) {
    menuItems.push({ icon: "piggy-bank", message: "Zap Pool", id: "i/dBAR", path: "/zap-pool" });
  }

  if (sub) {
    menuItems.push({ icon: "code-circle", message: "Account Switcher", id: "7BX/yC", path: "accounts" });
  }

  const getNavLinkClass = ({ isActive }: { isActive: boolean }) => {
    return isActive ? "settings-row active" : "settings-row";
  };

  return (
    <div className="settings-nav">
      {!hideMenu && (
        <div>
          {menuItems.map(({ icon, message, id, path }) => (
            <NavLink to={path} key={path} className={getNavLinkClass} end>
              <Icon name={icon} size={24} />
              <FormattedMessage {...(id ? { defaultMessage: message, id } : message)} />
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
