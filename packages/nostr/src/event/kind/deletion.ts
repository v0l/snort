import {
  EventKind,
  EventProps,
  EventId,
  InputEventProps,
  signEvent,
  verifySignature,
} from ".."
import { DeepReadonly, NostrError } from "../../common"
import { HexOrBechPrivateKey } from "../../crypto"
import { EventCommon } from "../common"
import { Delegation, delegationTag, verifyDelegation } from "../delegation"

/**
 * A deletion event. Used for marking published events as deleted.
 *
 * Related NIPs: NIP-09.
 */
export class Deletion extends EventCommon {
  override readonly kind: EventKind.Deletion

  constructor(props: EventProps) {
    super(props)
    if (props.kind !== EventKind.Deletion) {
      throw new NostrError("invalid event kind")
    }
    this.kind = props.kind
  }

  /**
   * Create a deletion event.
   */
  static async create(
    opts: DeepReadonly<{
      events: EventId[]
      content?: string
      base?: InputEventProps
      priv?: HexOrBechPrivateKey
      delegation?: Delegation<string>
    }>
  ): Promise<Deletion> {
    const tags = structuredClone((opts.base?.tags as string[][]) ?? [])
    if (opts.delegation !== undefined) {
      tags.push(delegationTag(opts.delegation))
    }
    tags.push(...opts.events.map((id) => ["e", id]))
    const base = {
      kind: EventKind.Deletion,
      tags,
      content: opts.base?.content ?? "",
      created_at: opts.base?.created_at,
    }
    const event = new Deletion(await signEvent(base, opts.priv))
    // Verify the delegation for correctness and verify the signature as a sanity check.
    await Promise.all([verifySignature(event), verifyDelegation(event)])
    return event
  }

  /**
   * The IDs of events to delete.
   */
  get deletedEvents(): EventId[] {
    return this.tags
      .filter((tag) => tag[0] === "e")
      .map((tag) => {
        if (tag[1] === undefined) {
          throw new NostrError(
            `invalid deletion event tag: ${JSON.stringify(tag)}`
          )
        }
        return tag[1]
      })
  }
}
