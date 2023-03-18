import { PublicKey } from "./crypto"
import { EventId, EventKind } from "./event"
import { Timestamp } from "./util"

/**
 * Subscription filters. All filters from the fields must pass for a message to get through.
 */
export interface Filters extends TagFilters {
  // TODO Document the filters, document that for the arrays only one is enough for the message to pass
  ids?: EventId[]
  authors?: string[]
  kinds?: EventKind[]
  since?: Timestamp
  until?: Timestamp
  limit?: number

  /**
   * Allows for arbitrary, nonstandard extensions.
   */
  [key: string]: unknown
}

/**
 * Generic tag queries as defined by NIP-12.
 */
interface TagFilters {
  ["#e"]: EventId[]
  ["#p"]: PublicKey[]

  ["#a"]: string[]
  ["#b"]: string[]
  ["#c"]: string[]
  ["#d"]: string[]
  ["#f"]: string[]
  ["#g"]: string[]
  ["#h"]: string[]
  ["#i"]: string[]
  ["#j"]: string[]
  ["#k"]: string[]
  ["#l"]: string[]
  ["#m"]: string[]
  ["#n"]: string[]
  ["#o"]: string[]
  ["#q"]: string[]
  ["#r"]: string[]
  ["#s"]: string[]
  ["#t"]: string[]
  ["#u"]: string[]
  ["#v"]: string[]
  ["#w"]: string[]
  ["#x"]: string[]
  ["#y"]: string[]
  ["#z"]: string[]

  ["#A"]: string[]
  ["#B"]: string[]
  ["#C"]: string[]
  ["#D"]: string[]
  ["#E"]: string[]
  ["#F"]: string[]
  ["#G"]: string[]
  ["#H"]: string[]
  ["#I"]: string[]
  ["#J"]: string[]
  ["#K"]: string[]
  ["#L"]: string[]
  ["#M"]: string[]
  ["#N"]: string[]
  ["#O"]: string[]
  ["#P"]: string[]
  ["#Q"]: string[]
  ["#R"]: string[]
  ["#S"]: string[]
  ["#T"]: string[]
  ["#U"]: string[]
  ["#V"]: string[]
  ["#W"]: string[]
  ["#X"]: string[]
  ["#Y"]: string[]
  ["#Z"]: string[]
}
