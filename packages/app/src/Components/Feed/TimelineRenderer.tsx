import type { TaggedNostrEvent } from "@snort/system"
import { type ReactNode, useCallback, useEffect, useRef } from "react"
import { useInView } from "react-intersection-observer"
import { FormattedMessage } from "react-intl"

import ErrorBoundary from "@/Components/ErrorBoundary"
import { AutoLoadMore } from "@/Components/Event/LoadMore"
import { TimelineFragment } from "@/Components/Feed/TimelineFragment"
import Icon from "@/Components/Icons/Icon"
import useWoT from "@/Hooks/useWoT"
import { AvatarGroup } from "../User/AvatarGroup"

export interface TimelineRendererProps {
  frags: Array<TimelineFragment> | TimelineFragment
  /**
   * List of pubkeys who have posted recently
   */
  latest: Array<string>
  showLatest: (toTop: boolean) => void
  noteRenderer?: (ev: TaggedNostrEvent) => ReactNode
  noteOnClick?: (ev: TaggedNostrEvent) => void
  noteContext?: (ev: TaggedNostrEvent) => ReactNode
  loadMore?: () => void
  highlightText?: string
}

export function TimelineRenderer(props: TimelineRendererProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const latestNotesFixedRef = useRef<HTMLButtonElement | null>(null)
  const { ref, inView } = useInView()
  const wot = useWoT()

  const updateLatestNotesPosition = useCallback(() => {
    if (containerRef.current && latestNotesFixedRef.current) {
      const parentRect = containerRef.current.getBoundingClientRect()
      const childWidth = latestNotesFixedRef.current.offsetWidth

      const leftPosition = parentRect.left + (parentRect.width - childWidth) / 2
      latestNotesFixedRef.current.style.left = `${leftPosition}px`
    }
  }, [])

  useEffect(() => {
    updateLatestNotesPosition()
    window.addEventListener("resize", updateLatestNotesPosition)

    return () => {
      window.removeEventListener("resize", updateLatestNotesPosition)
    }
  }, [updateLatestNotesPosition])

  const renderNotes = () => {
    const frags = Array.isArray(props.frags) ? props.frags : [props.frags]
    return frags.map((frag, index) => {
      const id = frag.events[0]?.id ?? index
      return (
        <ErrorBoundary key={id}>
          <TimelineFragment
            frag={frag}
            noteRenderer={props.noteRenderer}
            noteOnClick={props.noteOnClick}
            noteContext={props.noteContext}
            highlightText={props.highlightText}
          />
        </ErrorBoundary>
      )
    })
  }

  function latestInner() {
    return (
      <div className="cursor-pointer flex flex-row justify-center items-center py-1.5 px-6 gap-2 text-white bg-highlight rounded-full">
        <div className="flex">
          <AvatarGroup ids={wot.sortPubkeys(props.latest).slice(0, 3)} />
        </div>
        <FormattedMessage
          defaultMessage="{n} new {n, plural, =1 {note} other {notes}}"
          id="3t3kok"
          values={{ n: props.latest.length }}
        />
        <Icon name="arrowUp" />
      </div>
    )
  }

  return (
    <div ref={containerRef}>
      {props.latest.length > 0 && (
        <>
          <button type="button" className="flex justify-center" onClick={() => props.showLatest(false)} ref={ref}>
            {latestInner()}
          </button>
          {!inView && (
            <button
              type="button"
              className="fixed top-[50px] z-3 opacity-90 shadow-md animate-fade-in"
              onClick={() => props.showLatest(true)}
            >
              {latestInner()}
            </button>
          )}
        </>
      )}
      {renderNotes()}
      {props.loadMore && <AutoLoadMore className="mx-3 my-4" onClick={props.loadMore} />}
    </div>
  )
}
