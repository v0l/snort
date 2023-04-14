import { NostrError, DeepReadonly, Timestamp } from "../common"
import {
  getPublicKey,
  HexOrBechPrivateKey,
  HexOrBechPublicKey,
  parsePrivateKey,
  parsePublicKey,
  PublicKey,
  schnorrSign,
  sha256,
} from "../crypto"
import * as secp256k1 from "@noble/secp256k1"
import { EventKind } from "../legacy"
import { EventProps } from "."

/**
 * Event delegation.
 * TODO Write a lot more detail about the delegation process, and link other functions
 * back to this documentation.
 *
 * Related NIPs: NIP-26.
 */
export interface Delegation<C extends string | DelegationConditions> {
  delegator: PublicKey
  conditions: C
  token: string
}

/**
 * The conditions for a delegation.
 * TODO Describe the string format
 */
export interface DelegationConditions {
  /**
   * The kinds of events that can be published with this delegation token.
   */
  kinds: EventKind[]
  /**
   * The time before which events can be published with this delegation token.
   */
  before?: Timestamp
  /**
   * The time after which events can be published with this delegation token.
   */
  after?: Timestamp
}

/**
 * Create a delegation that allows delegatee to publish events in the name of priv.
 * If no conditions are specified, the delegation will allow the delegatee to publish
 * any event.
 */
export async function createDelegation(
  delegatee: HexOrBechPublicKey,
  priv: HexOrBechPrivateKey,
  conditions?: DeepReadonly<Partial<DelegationConditions>>
): Promise<Delegation<string>> {
  delegatee = parsePublicKey(delegatee)
  priv = parsePrivateKey(priv)
  const delegationConditions = formatDelegationConditions(conditions ?? {})
  const token = `nostr:delegation:${delegatee}:${delegationConditions}`
  return {
    delegator: getPublicKey(priv),
    conditions: delegationConditions,
    token: await schnorrSign(
      await sha256(new TextEncoder().encode(token)),
      priv
    ),
  }
}

/**
 * Parse the delegation conditions string.
 */
export function parseDelegationConditions(
  conditions: string
): DelegationConditions & { str: string } {
  let before: number | undefined
  let after: number | undefined
  const kinds: EventKind[] = []
  if (conditions !== "") {
    for (let condition of conditions.split("&")) {
      if (condition.startsWith("kind=")) {
        condition = condition.replace("kind=", "")
        const kind = parseInt(condition)
        if (Number.isNaN(kind)) {
          throw new NostrError("invalid delegation condition")
        }
        kinds.push(kind)
      } else if (condition.startsWith("created_at<")) {
        if (before !== undefined) {
          throw new NostrError(
            `invalid delegation condition ${condition}: created_at< already specified`
          )
        }
        condition = condition.replace("created_at<", "")
        const timestamp = parseInt(condition)
        if (Number.isNaN(timestamp)) {
          throw new NostrError(
            `invalid delegation condition ${condition}: invalid timestamp`
          )
        }
        before = timestamp
      } else if (condition.startsWith("created_at>")) {
        if (after !== undefined) {
          throw new NostrError(
            `invalid delegation condition ${condition}: created_at> already specified`
          )
        }
        condition = condition.replace("created_at>", "")
        const timestamp = parseInt(condition)
        if (Number.isNaN(timestamp)) {
          throw new NostrError(
            `invalid delegation condition ${condition}: invalid timestamp`
          )
        }
        after = timestamp
      } else {
        throw new NostrError(
          `invalid delegation condition ${condition}: unknown field`
        )
      }
    }
  }
  return {
    kinds,
    before,
    after,
    str: conditions,
  }
}

/**
 * Format the delegation conditions into a string.
 */
export function formatDelegationConditions(
  conditions: DeepReadonly<Partial<DelegationConditions>>
): string {
  const pieces = (conditions.kinds ?? []).map((k) => `kind=${k}`)
  if (conditions.before !== undefined) {
    pieces.push(`created_at<${conditions.before}`)
  }
  if (conditions.after !== undefined) {
    pieces.push(`created_at>${conditions.after}`)
  }
  return pieces.join("&")
}

// TODO Not exposed to the user
/**
 * Get the delegation from an event.
 */
export function getDelegation(
  event: EventProps
): Delegation<DelegationConditions & { str: string }> | undefined {
  // Get the delegation tag.
  const delegations = event.tags.filter((t) => t[0] === "delegation")
  if (delegations.length === 0) {
    return undefined
  }
  if (delegations.length > 1) {
    throw new NostrError("multiple delegations")
  }
  const delegation = delegations[0]

  // TODO Validate the length, field types, hex keys, check the length of the delegation token

  return {
    delegator: delegation[1],
    conditions: parseDelegationConditions(delegation[2]),
    token: delegation[3],
  }
}

// TODO Not exposed to the user
/**
 * Create an event tag which represents the delegation.
 */
export function delegationTag(delegation: Delegation<string>): string[] {
  return [
    "delegation",
    delegation.delegator,
    delegation.conditions,
    delegation.token,
  ]
}

// TODO Not exposed to the user
/**
 * Verify that the delegation of an event is valid. This includes checking the
 * signature in the delegation token, and checking that the conditions are met.
 */
export async function verifyDelegation(event: EventProps): Promise<void> {
  const delegation = getDelegation(event)
  if (delegation === undefined) {
    return
  }

  // Check the Schnorr signature inside the delegation token.
  if (
    !(await secp256k1.schnorr.verify(
      delegation.token,
      await sha256(
        new TextEncoder().encode(
          `nostr:delegation:${event.pubkey}:${delegation.conditions.str}`
        )
      ),
      delegation.delegator
    ))
  ) {
    throw new NostrError("invalid delegation token: invalid schnorr signature")
  }

  // Check the delegation conditions.
  if (
    delegation.conditions.kinds.length > 0 &&
    !delegation.conditions.kinds.includes(event.kind)
  ) {
    throw new NostrError(
      `invalid delegation: event kind ${event.kind} not allowed`
    )
  }
  if (
    delegation.conditions.before !== undefined &&
    event.created_at >= delegation.conditions.before
  ) {
    throw new NostrError(
      `invalid delegation: event.created_at ${event.created_at} is not before ${before}`
    )
  }
  if (
    delegation.conditions.after !== undefined &&
    event.created_at <= delegation.conditions.after
  ) {
    throw new NostrError(
      `invalid delegation: event.created_at ${event.created_at} is not after ${after}`
    )
  }
}
