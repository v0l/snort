import "./Layout.css";
import { useCallback } from "react";
import { Outlet, useLocation } from "react-router-dom";

import useLogin from "@/Hooks/useLogin";
import { isFormElement } from "@/SnortUtils";
import Toaster from "@/Toaster";
import { useTheme } from "@/Hooks/useTheme";
import { useLoginRelays } from "@/Hooks/useLoginRelays";
import { LoginUnlock } from "@/Element/PinPrompt";
import useKeyboardShortcut from "@/Hooks/useKeyboardShortcut";
import { LoginStore } from "@/Login";
import NavSidebar from "./NavSidebar";
import RightColumn from "./RightColumn";
import useLoginFeed from "@/Feed/LoginFeed";
import ErrorBoundary from "@/Element/ErrorBoundary";
import Footer from "@/Pages/Layout/Footer";
import { Header } from "@/Pages/Layout/Header";
import CloseButton from "@/Element/Button/CloseButton";

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
        <div className="flex flex-row">
          <NavSidebar />
          <div className="flex flex-1 flex-col pb-footer-height md:pb-0 w-full md:w-1/3">
            {!shouldHideHeader && <Header />}
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

function StalkerModal({ id }) {
  return (
    <div className="stalker" onClick={() => LoginStore.removeSession(id)}>
      <CloseButton />
    </div>
  );
}
