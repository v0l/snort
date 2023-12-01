import "./Layout.css";
import { useCallback } from "react";
import { Outlet, useLocation } from "react-router-dom";

import Icon from "@/Icons/Icon";
import useLogin from "@/Hooks/useLogin";
import { isFormElement } from "@/SnortUtils";
import Toaster from "@/Toaster";
import { useTheme } from "@/Hooks/useTheme";
import { useLoginRelays } from "@/Hooks/useLoginRelays";
import { LoginUnlock } from "@/Element/PinPrompt";
import useKeyboardShortcut from "@/Hooks/useKeyboardShortcut";
import { LoginStore } from "@/Login";
import NavSidebar from "./NavSidebar";
import NotificationsHeader from "./NotificationsHeader";
import RightColumn from "./RightColumn";
import { LogoHeader } from "./LogoHeader";
import useLoginFeed from "@/Feed/LoginFeed";
import ErrorBoundary from "@/Element/ErrorBoundary";
import Footer from "@/Pages/Layout/Footer";

export default function Index() {
  const location = useLocation();
  const { id, stalker } = useLogin(s => ({ id: s.id, stalker: s.stalker ?? false }));

  useTheme();
  useLoginRelays();
  useLoginFeed();

  const hideHeaderPaths = ["/login", "/new"];
  const shouldHideFooter = location.pathname.startsWith("/messages/");
  const shouldHideHeader = hideHeaderPaths.some(path => location.pathname.startsWith(path));

  const handleKeyboardShortcut = useCallback(event => {
    if (event.target && !isFormElement(event.target as HTMLElement)) {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, []);

  useKeyboardShortcut(".", handleKeyboardShortcut);

  const isStalker = !!stalker;

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-screen-xl">
        {!shouldHideHeader && <Header />}
        <div className="flex flex-row w-full">
          <NavSidebar />
          <div className="flex flex-1 flex-col overflow-x-hidden">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
          <RightColumn />
        </div>
        <Toaster />
      </div>
      <LoginUnlock />
      {isStalker && <StalkerModal id={id} />}
      {!shouldHideFooter && <Footer />}
    </div>
  );
}

function Header() {
  return (
    <header className="flex justify-between items-center self-stretch px-4 gap-6 sticky top-0 md:hidden z-10 bg-bg-color py-1">
      <LogoHeader showText={true} />
      <NotificationsHeader />
    </header>
  );
}

function StalkerModal({ id }) {
  return (
    <div className="stalker" onClick={() => LoginStore.removeSession(id)}>
      <button type="button" className="circle flex items-center">
        <Icon name="close" />
      </button>
    </div>
  );
}
