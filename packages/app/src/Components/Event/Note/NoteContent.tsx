import { EventExt, EventKind, type TaggedNostrEvent } from "@snort/system"
import classNames from "classnames"

import type { NoteProps, NotePropsOptions } from "@/Components/Event/EventComponent"
import { useNoteContext } from "@/Components/Event/Note/NoteContext"
import NoteFooter from "@/Components/Event/Note/NoteFooter/NoteFooter"
import NoteHeader from "@/Components/Event/Note/NoteHeader"
import { NoteText } from "@/Components/Event/Note/NoteText"
import { TranslationInfo } from "@/Components/Event/Note/TranslationInfo"
import Poll from "@/Components/Event/Poll"

interface NoteContentProps {
  props: NoteProps
  options: NotePropsOptions
  goToEvent: (e: React.MouseEvent, eTarget: TaggedNostrEvent) => void
  setSeenAtRef: (node?: Element | null) => void
  waitUntilInView?: boolean
  inView: boolean
}

export function NoteContent({ props, options, goToEvent, setSeenAtRef, waitUntilInView, inView }: NoteContentProps) {
  const { ev, translated, showTranslation } = useNoteContext()

  if (waitUntilInView && !inView) return null

  return (
    <>
      {options.showHeader && <NoteHeader options={options} />}
      <button
        type="button"
        onClick={e => goToEvent(e, ev)}
        className={classNames("min-h-0 bg-transparent border-0 p-0 m-0 cursor-pointer", props.inset)}
        ref={setSeenAtRef}
      >
        <NoteText {...props} translated={translated} showTranslation={showTranslation} />
        {translated && <TranslationInfo />}
        {ev.kind === EventKind.Polls && <Poll ev={ev} zaps={[]} />}
        {options.showFooter && (
          <div className="mt-4">
            <NoteFooter replyCount={props.threadChains?.get(EventExt.keyOf(ev))?.length} />
          </div>
        )}
      </button>
    </>
  )
}
