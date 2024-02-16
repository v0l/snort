import "./Layout.css";

import { useCallback, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

import CloseButton from "@/Components/Button/CloseButton";
import ErrorBoundary from "@/Components/ErrorBoundary";
import { LoginUnlock } from "@/Components/PinPrompt/PinPrompt";
import ScrollToTop from "@/Components/ScrollToTop";
import Toaster from "@/Components/Toaster/Toaster";
import useLoginFeed from "@/Feed/LoginFeed";
import { useCommunityLeaders } from "@/Hooks/useCommunityLeaders";
import useKeyboardShortcut from "@/Hooks/useKeyboardShortcut";
import useLogin from "@/Hooks/useLogin";
import { useLoginRelays } from "@/Hooks/useLoginRelays";
import { useTheme } from "@/Hooks/useTheme";
import Footer from "@/Pages/Layout/Footer";
import { Header } from "@/Pages/Layout/Header";
import { isFormElement, trackEvent } from "@/Utils";
import { LoginStore } from "@/Utils/Login";

import NavSidebar from "./NavSidebar";
import RightColumn from "./RightColumn";

export default function Index() {
  const location = useLocation();
  const { id, stalker, telemetry } = useLogin(s => ({
    id: s.id,
    stalker: s.stalker ?? false,
    telemetry: s.appData.item.preferences.telemetry,
  }));

  useTheme();
  useLoginRelays();
  useLoginFeed();
  useCommunityLeaders();

  const hideHeaderPaths = ["/login", "/new"];
  const shouldHideFooter = location.pathname.startsWith("/messages/");
  const shouldHideHeader = hideHeaderPaths.some(path => location.pathname.startsWith(path));

  const handleKeyboardShortcut = useCallback((event: Event) => {
    if (event.target && !isFormElement(event.target as HTMLElement)) {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, []);

  useEffect(() => {
    if (CONFIG.features.analytics && (telemetry ?? true)) {
      trackEvent("pageview");
    }
  }, [location]);

  useKeyboardShortcut(".", handleKeyboardShortcut);

  const isStalker = !!stalker;

  return (
    <ErrorBoundary>
      <ScrollToTop />
      <div className="flex justify-center">
        <div className="w-full max-w-screen-xl">
          <div className="flex flex-row">
            <NavSidebar />
            <div className="flex flex-1 flex-col pb-safe-area-plus-footer w-full md:w-1/3">
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
    </ErrorBoundary>
  );
}

function StalkerModal({ id }: { id: string }) {
  return (
    <div className="stalker" onClick={() => LoginStore.removeSession(id)}>
      <CloseButton />
    </div>
  );
}
