import { type NostrLink, tryParseNostrLink } from "@snort/system"
import { useEventFeed } from "@snort/system-react"
import classNames from "classnames"
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react"
import { FormattedMessage } from "react-intl"

import ErrorBoundary from "@/Components/ErrorBoundary"
import Icon from "@/Components/Icons/Icon"
import DisplayName from "@/Components/User/DisplayName"
import ProfileImage from "@/Components/User/ProfileImage"

import { PaneSourceAttr } from "./PaneContext"
import { PaneRoute } from "./PaneRoute"
import { type Pane, type PaneEntry, visiblePanes } from "./panes"

const PaneMin = 420
const SpineWidth = 48
const paneScroll = new Map<string, number>()

function entityOf(pane: Pane) {
  const parts = pane.path.split("/").filter(Boolean)
  return tryParseNostrLink(parts[parts.length - 1] ?? "")
}

function NoteAuthor({ link, children }: { link: NostrLink; children: (pubkey?: string) => ReactNode }) {
  const ev = useEventFeed(link)
  return <>{children(ev?.pubkey)}</>
}

function PaneTitle({ pane }: { pane: Pane }) {
  const link = entityOf(pane)
  if (pane.kind === "notifications") return <FormattedMessage defaultMessage="Notifications" />
  if (pane.kind === "profile") {
    return link ? <DisplayName pubkey={link.id} /> : <span>{pane.path.slice(1)}</span>
  }
  if (!link) return <FormattedMessage defaultMessage="Note" />
  return (
    <NoteAuthor link={link}>
      {pubkey =>
        pubkey ? (
          <FormattedMessage defaultMessage="Note by {name}" values={{ name: <DisplayName pubkey={pubkey} /> }} />
        ) : (
          <FormattedMessage defaultMessage="Note" />
        )
      }
    </NoteAuthor>
  )
}

function Face({ pubkey }: { pubkey?: string }) {
  if (!pubkey) return <Icon name="notes" size={20} />
  return <ProfileImage pubkey={pubkey} size={28} showUsername={false} link="" showProfileCard={false} />
}

function PaneFace({ pane }: { pane: Pane }) {
  const link = entityOf(pane)
  if (pane.kind === "notifications") return <Icon name="bell-outline" size={20} />
  if (pane.kind === "profile") return <Face pubkey={link?.id} />
  if (!link) return <Face />
  return <NoteAuthor link={link}>{pubkey => <Face pubkey={pubkey} />}</NoteAuthor>
}

function PaneScroller({ id, children }: { id: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const saved = paneScroll.get(id) ?? 0
    el.scrollTop = saved
    let tries = 0
    const timer = window.setInterval(() => {
      if (el.scrollTop >= saved - 2 || tries++ > 20) {
        window.clearInterval(timer)
        return
      }
      el.scrollTop = saved
    }, 100)
    const save = () => paneScroll.set(id, el.scrollTop)
    el.addEventListener("scroll", save, { passive: true })
    return () => {
      window.clearInterval(timer)
      el.removeEventListener("scroll", save)
    }
  }, [id])
  return (
    <div ref={ref} className="flex-1 overflow-y-auto overscroll-contain hide-scrollbar" data-pane-scroller>
      {children}
    </div>
  )
}

export function PaneStack({
  entry,
  width,
  onBack,
  onClose,
  onFocus,
  overlay,
}: {
  entry: PaneEntry
  width: number
  onBack: () => void
  onClose: (index: number) => void
  onFocus: (index: number) => void
  overlay: boolean
}) {
  const { panes } = entry
  const open = overlay ? 1 : visiblePanes(panes.length, width, PaneMin, SpineWidth)
  const firstOpen = panes.length - open

  return (
    <section
      className={classNames("flex min-w-0", overlay ? "fixed inset-0 z-30 bg-black light:bg-white flex-col" : "h-full")}
      aria-label="Open panes"
    >
      {overlay && panes.length > 1 && (
        <div className="flex gap-1.5 px-3 pt-2 overflow-x-auto hide-scrollbar flex-none">
          {panes.map((p, i) => (
            <button
              key={`${entry.feed.key}:${p.path}`}
              type="button"
              onClick={() => onFocus(i)}
              aria-current={i === panes.length - 1}
              className={classNames(
                "plain flex-none rounded-full px-3 py-1 text-sm font-semibold whitespace-nowrap max-w-48 truncate",
                i === panes.length - 1
                  ? "bg-white text-black light:bg-black light:text-white"
                  : "bg-layer-2 text-neutral-400",
              )}
            >
              <PaneTitle pane={p} />
            </button>
          ))}
        </div>
      )}
      {panes.map((p, i) => {
        const id = `${entry.feed.key}:${i}:${p.path}`
        if (i < firstOpen) {
          return (
            <button
              key={id}
              type="button"
              onClick={() => onFocus(i)}
              className={classNames(
                "plain flex-none w-12 h-full border-r flex flex-col items-center gap-3 py-3 bg-layer-1 hover:bg-layer-2 text-neutral-400 hover:text-white light:hover:text-black",
                { hidden: overlay },
              )}
              title="Show this pane"
            >
              <PaneFace pane={p} />
              <span className="[writing-mode:vertical-rl] text-sm font-semibold whitespace-nowrap overflow-hidden">
                <PaneTitle pane={p} />
              </span>
            </button>
          )
        }
        return (
          <section
            key={id}
            {...{ [PaneSourceAttr]: i }}
            className={classNames(
              "flex flex-col min-w-0 border-r",
              overlay ? "flex-1 min-h-0" : "flex-1 h-full max-w-[720px]",
            )}
            style={overlay ? undefined : { minWidth: PaneMin }}
          >
            <div className="flex items-center gap-1 h-14 px-2 border-b flex-none">
              <button
                type="button"
                onClick={onBack}
                className="plain p-2 rounded-lg hover:bg-layer-2"
                aria-label="Back"
                title="Back"
              >
                <Icon name="arrowBack" size={18} />
              </button>
              <h2 className="flex-1 min-w-0 truncate text-base font-semibold m-0">
                <PaneTitle pane={p} />
              </h2>
              <button
                type="button"
                onClick={() => onClose(i)}
                className="plain p-2 rounded-lg hover:bg-layer-2 text-neutral-400"
                aria-label="Close"
                title="Close"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <PaneScroller id={id}>
              <ErrorBoundary>
                <PaneRoute path={p.path} />
              </ErrorBoundary>
            </PaneScroller>
          </section>
        )
      })}
    </section>
  )
}

export function useElementWidth<T extends HTMLElement>(enabled: boolean) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return
    let last = -1
    const measure = () => {
      const w = Math.round(el.clientWidth)
      if (w !== last) {
        last = w
        setWidth(w)
      }
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    measure()
    return () => ro.disconnect()
  }, [enabled])
  return [ref, width] as const
}
