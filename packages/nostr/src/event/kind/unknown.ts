import {
  EventKind,
  EventProps,
  InputEventProps,
  signEvent,
  verifySignature,
} from ".."
import { DeepReadonly } from "../../common"
import { HexOrBechPrivateKey } from "../../crypto"
import { EventCommon } from "../common"
import { Delegation, delegationTag, verifyDelegation } from "../delegation"

export class Unknown extends EventCommon {
  override readonly kind: Exclude<
    EventKind,
    | EventKind.SetMetadata
    | EventKind.TextNote
    | EventKind.ContactList
    | EventKind.DirectMessage
    | EventKind.Deletion
  >

  constructor(event: EventProps) {
    super(event)
    if (
      event.kind === EventKind.SetMetadata ||
      event.kind === EventKind.TextNote ||
      event.kind === EventKind.ContactList ||
      event.kind === EventKind.DirectMessage ||
      event.kind === EventKind.Deletion
    ) {
      throw new Error("invalid event kind")
    }
    this.kind = event.kind
  }

  static async create(
    opts: DeepReadonly<{
      kind: EventKind
      base?: InputEventProps
      priv?: HexOrBechPrivateKey
      delegation?: Delegation<string>
    }>
  ): Promise<Unknown> {
    const tags = structuredClone((opts.base?.tags as string[][]) ?? [])
    if (opts.delegation !== undefined) {
      tags.push(delegationTag(opts.delegation))
    }
    const event = await signEvent(
      {
        kind: opts.kind,
        tags,
        content: opts.base?.content ?? "",
        created_at: opts.base?.created_at,
      },
      opts.priv
    )
    // Verify the delegation for correctness and verify the signature as a sanity check.
    await Promise.all([verifySignature(event), verifyDelegation(event)])
    return new Unknown(event)
  }
}
