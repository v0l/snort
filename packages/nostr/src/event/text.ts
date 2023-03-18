import { EventKind, RawEvent, Unsigned } from "."

/**
 * A text note event. Used for transmitting user posts.
 *
 * Related NIPs: NIP-01.
 */
export interface TextNote extends RawEvent {
  kind: EventKind.TextNote
}

export function createTextNote(content: string): Unsigned<TextNote> {
  return {
    kind: EventKind.TextNote,
    tags: [],
    content,
  }
}
