import { EventId, EventKind, RawEvent, signEvent } from "."
import { NostrError } from "../common"
import { HexOrBechPrivateKey } from "../crypto"

/**
 * A deletion event. Used for marking published events as deleted.
 *
 * Related NIPs: NIP-09.
 */
export interface Deletion extends RawEvent {
  kind: EventKind.Deletion

  /**
   * The IDs of events to delete.
   */
  getEvents(): EventId[]
}

/**
 * Create a deletion event.
 */
export function createDeletion(
  { events, content }: { events: EventId[]; content?: string },
  priv?: HexOrBechPrivateKey
): Promise<Deletion> {
  return signEvent(
    {
      kind: EventKind.Deletion,
      tags: events.map((id) => ["e", id]),
      content: content ?? "",
      getEvents,
    },
    priv
  )
}

export function getEvents(this: Deletion): EventId[] {
  return this.tags
    .filter((tag) => tag[0] === "e")
    .map((tag) => {
      if (tag[1] !== undefined) {
        throw new NostrError(
          `invalid deletion event tag: ${JSON.stringify(tag)}`
        )
      }
      return tag[1]
    })
}
