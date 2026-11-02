import type { TaggedNostrEvent } from "@snort/system"
import { Fragment, type ReactNode } from "react"

import Note from "@/Components/Event/EventComponent"
import { LeftOffDivider } from "@/Components/Feed/LeftOff"

export interface TimelineFragment {
  events: Array<TaggedNostrEvent>
  refTime: number
  title?: ReactNode
}

export interface TimelineFragProps {
  frag: TimelineFragment
  noteRenderer?: (ev: TaggedNostrEvent) => ReactNode
  noteOnClick?: (ev: TaggedNostrEvent) => void
  noteContext?: (ev: TaggedNostrEvent) => ReactNode
  highlightText?: string
  leftOffAt?: number
}

const options = {
  truncate: true,
}

export function TimelineFragment(props: TimelineFragProps) {
  return (
    <>
      {props.frag.title}
      {props.frag.events.map((e, index) => {
        const leftOff = props.leftOffAt ?? 0
        const showDivider =
          leftOff > 0 && e.created_at <= leftOff && (index === 0 || props.frag.events[index - 1].created_at > leftOff)
        return (
          <Fragment key={e.id}>
            {showDivider && <LeftOffDivider at={leftOff} />}
            {props.noteRenderer?.(e) ?? (
              <Note
                data={e}
                depth={0}
                onClick={props.noteOnClick}
                context={props.noteContext?.(e)}
                options={options}
                waitUntilInView={index > 5}
                highlightText={props.highlightText}
              />
            )}
          </Fragment>
        )
      })}
    </>
  )
}
