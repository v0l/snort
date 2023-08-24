import { EventKind, RawEvent, signEvent } from "."
import { HexOrBechPrivateKey } from "../crypto"

/**
 * A text note event. Used for transmitting user posts.
 *
 * Related NIPs: NIP-01.
 */
export interface TextNote extends RawEvent {
  kind: EventKind.TextNote
}

export function createTextNote(
  content: string,
  priv?: HexOrBechPrivateKey,
): Promise<TextNote> {
  return signEvent(
    {
      kind: EventKind.TextNote,
      tags: [],
      content,
    },
    priv,
  )
}
