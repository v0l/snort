import { decodeTLV } from "@snort/shared"
import { tryParseNostrLink } from "@snort/system"

export function isValidChatId(id: string | undefined) {
  if (!id) return true
  if (!id.startsWith("nchat17")) return false
  try {
    decodeTLV(id)
    return true
  } catch {
    return false
  }
}

export function isValidListFeedId(id: string | undefined) {
  return id !== undefined && tryParseNostrLink(id) !== undefined
}

export function notFoundUnless(valid: boolean) {
  if (!valid) {
    throw new Response(null, { status: 404, statusText: "Not Found" })
  }
  return null
}
