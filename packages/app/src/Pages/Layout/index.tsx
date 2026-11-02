import { TraceTimelineOverlay } from "@snort/system-react"
import "@snort/system-react/dist/TraceTimeline/TraceTimeline.css"
import { useCallback, useEffect } from "react"
import { Helmet } from "react-helmet-async"
import { useLocation } from "react-router-dom"

import CloseButton from "@/Components/Button/CloseButton"
import ErrorBoundary from "@/Components/ErrorBoundary"
import { LoginUnlock } from "@/Components/PinPrompt/PinPrompt"
import ScrollToTop from "@/Components/ScrollToTop"
import { TimeRail } from "@/Components/Feed/TimeRail"
import Toaster from "@/Components/Toaster/Toaster"
import useLoginFeed from "@/Feed/LoginFeed"
import { useCommunityLeaders } from "@/Hooks/useCommunityLeaders"
import useKeyboardShortcut from "@/Hooks/useKeyboardShortcut"
import useLogin from "@/Hooks/useLogin"
import { useLoginRelays } from "@/Hooks/useLoginRelays"
import usePreferences from "@/Hooks/usePreferences"
import { useTheme } from "@/Hooks/useTheme"
import { useTraceTimeline } from "@/Hooks/useTraceTimeline"
import useWindowSize from "@/Hooks/useWindowSize"
import { isFormElement, trackEvent } from "@/Utils"
import { LoginStore } from "@/Utils/Login"

import Footer from "./Footer"
import { FrozenLocation } from "./FrozenLocation"
import { PaneContext, recordPaneSource } from "./PaneContext"
import { PaneStack, useElementWidth } from "./PaneStack"
import { usePaneController } from "./usePaneController"
import { Header } from "./Header"
import NavSidebar from "./NavSidebar"
import RightColumn from "./RightColumn"

const TimelinePaths = ["/following", "/conversations", "/for-you", "/followed-by-friends", "/media"]

export default function Index() {
  const location = useLocation()
  const panes = usePaneController()
  const pageSize = useWindowSize()
  const overlay = pageSize.width < 1024
  const [stackRef, stackWidth] = useElementWidth<HTMLDivElement>(!!panes.entry && !overlay)
  const { id, stalker } = useLogin(s => ({
    id: s.id,
    stalker: s.stalker ?? false,
  }))
  const telemetry = usePreferences(s => s.telemetry)
  const traceTimeline = useTraceTimeline()

  useTheme()
  useLoginRelays()
  useLoginFeed()
  useCommunityLeaders()

  const feedPath = panes.feedLocation?.pathname ?? location.pathname
  const showTimeRail = TimelinePaths.includes(feedPath) || feedPath.startsWith("/t/")
  const hideHeaderPaths = ["/login", "/new"]
  const shouldHideFooter = feedPath.startsWith("/messages/")
  const shouldHideHeader = hideHeaderPaths.some(path => feedPath.startsWith(path))

  const handleKeyboardShortcut = useCallback((event: Event) => {
    if (event.target && !isFormElement(event.target as HTMLElement)) {
      event.preventDefault()
      window.scrollTo({ top: 0, behavior: "instant" })
    }
  }, [])

  const handleTraceTimelineShortcut = useCallback(
    (event: Event) => {
      if (event.target && !isFormElement(event.target as HTMLElement)) {
        event.preventDefault()
        traceTimeline.toggle()
      }
    },
    [traceTimeline],
  )

  useEffect(() => {
    if (CONFIG.features.analytics && (telemetry ?? true)) {
      trackEvent("pageview")
    }
  }, [telemetry])

  useKeyboardShortcut(".", handleKeyboardShortcut)
  useKeyboardShortcut("t", handleTraceTimelineShortcut)

  const isStalker = !!stalker

  return (
    <ErrorBoundary>
      <Helmet>
        <title>{CONFIG.appTitle}</title>
      </Helmet>
      <ScrollToTop paneOpen={!!panes.entry} />
      <PaneContext value={panes}>
        <div className="flex justify-center" onClickCapture={e => recordPaneSource(e.target)}>
          <div className="w-full max-w-[1680px]">
            <div className="flex">
              <NavSidebar />
              {showTimeRail && <TimeRail key={feedPath} />}
              <FrozenLocation location={panes.feedLocation}>
                <div
                  className={`flex flex-col w-full min-w-0 md:max-w-[640px] md:flex-none md:w-[640px] lg:flex-1 border-r${shouldHideFooter ? "" : " pb-safe-area-plus-footer"}`}
                  data-feed-column
                >
                  {!shouldHideHeader && <Header />}
                  <ErrorBoundary>{panes.feedOutlet}</ErrorBoundary>
                </div>
              </FrozenLocation>
              <div ref={stackRef} className="hidden lg:flex flex-1 min-w-[340px] sticky top-0 h-screen">
                {panes.entry && !overlay ? (
                  <PaneStack
                    entry={panes.entry}
                    width={stackWidth}
                    onBack={panes.back}
                    onClose={panes.closeFrom}
                    onFocus={panes.focus}
                    overlay={false}
                  />
                ) : (
                  <FrozenLocation location={panes.feedLocation}>
                    <RightColumn />
                  </FrozenLocation>
                )}
              </div>
            </div>
            <Toaster />
          </div>
        </div>
        {panes.entry && overlay && (
          <PaneStack
            entry={panes.entry}
            width={pageSize.width}
            onBack={panes.back}
            onClose={panes.closeFrom}
            onFocus={panes.focus}
            overlay={true}
          />
        )}
      </PaneContext>
      <div>
        <LoginUnlock />
        {isStalker && <StalkerModal id={id} />}
        {!shouldHideFooter && <Footer />}
        <TraceTimelineOverlay isOpen={traceTimeline.isOpen} onClose={() => traceTimeline.close()} />
      </div>
    </ErrorBoundary>
  )
}

function StalkerModal({ id }: { id: string }) {
  return (
    <div className="stalker" onClick={() => LoginStore.removeSession(id)}>
      <CloseButton />
    </div>
  )
}
