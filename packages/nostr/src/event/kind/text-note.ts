import { EventKind, EventProps, signEvent, verifySignature } from ".."
import { DeepReadonly, NostrError, Timestamp } from "../../common"
import { HexOrBechPrivateKey } from "../../crypto"
import { EventCommon } from "../common"
import { Delegation, delegationTag, verifyDelegation } from "../delegation"

/**
 * A text note event. Used for transmitting user posts.
 *
 * Related NIPs: NIP-01.
 */
export class TextNote extends EventCommon {
  override readonly kind: EventKind.TextNote

  constructor(event: EventProps) {
    super(event)
    if (event.kind !== EventKind.TextNote) {
      throw new NostrError("invalid event kind")
    }
    this.kind = event.kind
  }

  static async create(
    opts: DeepReadonly<{
      note: string
      base?: {
        tags?: string[][]
        created_at?: Timestamp
      }
      priv?: HexOrBechPrivateKey
      delegation?: Delegation<string>
    }>
  ): Promise<TextNote> {
    const tags = structuredClone((opts.base?.tags as string[][]) ?? [])
    if (opts.delegation !== undefined) {
      tags.push(delegationTag(opts.delegation))
    }
    const event = await signEvent(
      {
        kind: EventKind.TextNote,
        tags,
        content: opts.note,
        created_at: opts.base?.created_at,
      },
      opts.priv
    )
    // Verify the delegation for correctness and verify the signature as a sanity check.
    await Promise.all([verifySignature(event), verifyDelegation(event)])
    return new TextNote(event)
  }

  get note(): string {
    return this.content
  }
}
