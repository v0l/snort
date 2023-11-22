import "./Layout.css";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { NoteCreatorButton } from "@/Element/Event/NoteCreatorButton";
import NavSidebar from "./NavSidebar";
import AccountHeader from "./AccountHeader";
import RightColumn from "./RightColumn";
import { LogoHeader } from "./LogoHeader";
import useLoginFeed from "@/Feed/LoginFeed";

export default function Index() {
  const location = useLocation();
  const [pageClass, setPageClass] = useState("page");
  const { id, stalker } = useLogin(s => ({ id: s.id, stalker: s.stalker ?? false }));

  useTheme();
  useLoginRelays();
  useLoginFeed();

  const hideHeaderPaths = ["/login", "/new"];
  const shouldHideHeader = hideHeaderPaths.some(path => location.pathname.startsWith(path));

  const pageClassPaths = useMemo(
    () => ({
      widePage: ["/login", "/messages"],
      noScroll: ["/messages"],
    }),
    [],
  );

  useEffect(() => {
    const isWidePage = pageClassPaths.widePage.some(path => location.pathname.startsWith(path));
    const isNoScroll = pageClassPaths.noScroll.some(path => location.pathname.startsWith(path));
    setPageClass(isWidePage ? (isNoScroll ? "scroll-lock" : "") : "page");
  }, [location, pageClassPaths]);

  const handleKeyboardShortcut = useCallback(event => {
    if (event.target && !isFormElement(event.target as HTMLElement)) {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  useKeyboardShortcut(".", handleKeyboardShortcut);

  const isStalker = !!stalker;

  return (
    <div className="h-screen flex justify-center">
      <div className={`${pageClass} w-full max-w-screen-xl overflow-x-hidden`}>
        {!shouldHideHeader && <Header />}
        <div className="flex flex-row w-full">
          <NavSidebar className="w-1/4 flex-shrink-0" />
          <div className="flex flex-1 flex-col overflow-x-hidden">
            <Outlet />
          </div>
          <RightColumn className="w-1/4 flex-shrink-0" />
        </div>
        <div className="md:hidden">
          <NoteCreatorButton className="note-create-button" />
        </div>
        <Toaster />
      </div>
      <LoginUnlock />
      {isStalker && <StalkerModal id={id} />}
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 md:hidden z-10 backdrop-blur-lg">
      <LogoHeader />
      <AccountHeader />
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
