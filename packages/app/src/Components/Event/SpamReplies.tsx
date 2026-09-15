import type { TaggedNostrEvent } from "@snort/system"
import { useState } from "react"
import { FormattedMessage } from "react-intl"

import Note from "@/Components/Event/EventComponent"

/** Replies dropped from the thread tree by nspam, summarised at the end of the thread */
export function SpamReplies({ notes }: { notes: ReadonlyArray<TaggedNostrEvent> }) {
  const [show, setShow] = useState(false)

  if (notes.length === 0) return

  return (
    <div className="my-3">
      <button
        type="button"
        className="layer-1 mx-2 font-medium cursor-pointer w-[calc(100%-1rem)] text-left px-3 py-2 rounded-lg"
        onClick={() => setShow(s => !s)}
      >
        <FormattedMessage
          defaultMessage="{n, plural, one {# reply hidden as spam} other {# replies hidden as spam}}"
          values={{ n: notes.length }}
        />
      </button>
      {show && (
        <div className="mt-2">
          {notes.map(n => (
            <Note key={n.id} data={n} ignoreModeration={true} options={{ showFooter: false, canClick: false }} />
          ))}
        </div>
      )}
    </div>
  )
}
