/**
 * Types defining data in the format sent over the wire.
 */

import { ProtocolError } from "./error"
import { IncomingMessage, OutgoingMessage } from "./nostr"

export interface RawEvent {
  id: string
  pubkey: string
  created_at: number
  kind: number
  tags: string[][]
  content: string
  sig: string
}

interface RawFilters {
  ids: string[]
  authors: string[]
  kinds: number[]
  ["#e"]: string[]
  ["#p"]: string[]
  since: number
  until: number
  limit: number
}

type RawIncomingMessage = ["EVENT", string, RawEvent] | ["NOTICE", string]

type RawOutgoingMessage =
  | ["EVENT", RawEvent]
  | ["REQ", string, RawFilters]
  | ["CLOSE", string]

export function parseIncomingMessage(msg: string): IncomingMessage {
  throw new Error("todo")
}

export function formatOutgoingMessage(msg: OutgoingMessage): string {
  throw new Error("todo")
}

function parseRawEvent(data: string): RawEvent {
  const json = parseJson(data)
  if (
    typeof json["id"] !== "string" ||
    typeof json["pubkey"] !== "string" ||
    typeof json["created_at"] !== "number" ||
    typeof json["kind"] !== "number" ||
    !(json["tags"] instanceof Array) ||
    !json["tags"].every(
      (x) => x instanceof Array && x.every((y) => typeof y === "string")
    ) ||
    typeof json["content"] !== "string" ||
    typeof json["sig"] !== "string"
  ) {
    throw new ProtocolError(`invalid event: ${data}`)
  }
  return json
}

function parseJson(data: string) {
  try {
    return JSON.parse(data)
  } catch (e) {
    throw new ProtocolError(`invalid event json: ${data}`)
  }
}
