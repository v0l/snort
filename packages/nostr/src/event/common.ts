import { EventProps, EventKind } from "."
import { Timestamp } from "../common"
import { PublicKey } from "../crypto"
import { Delegation, DelegationConditions, getDelegation } from "./delegation"

/**
 * The base class for all event classes.
 */
export class EventCommon implements EventProps {
  readonly id: string
  readonly pubkey: PublicKey
  readonly created_at: Timestamp
  readonly sig: string
  readonly kind: EventKind
  readonly tags: readonly (readonly string[])[]
  readonly content: string

  constructor(props: EventProps) {
    // TODO Check the event format, lowercase hex, anything else?
    // TODO Check that each tag has at least one element (right?)
    this.id = props.id
    this.pubkey = props.pubkey
    this.created_at = props.created_at
    this.sig = props.sig
    this.kind = props.kind
    this.tags = structuredClone(props.tags)
    this.content = props.content
  }

  /**
   * Get the event author. If the event is delegated, returns the delegator. Otherwise, returns the
   * pubkey field of the event.
   */
  get author(): PublicKey {
    return this.delegation?.delegator ?? this.pubkey
  }

  /**
   * Get the delegation from the event. If the event is not delegated, return undefined.
   */
  get delegation():
    | Delegation<
        DelegationConditions & {
          /**
           * The raw delegation string as it was specified in the event.
           */
          str: string
        }
      >
    | undefined {
    return getDelegation(this)
  }
}
