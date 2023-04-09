import { PublicKey } from "./crypto"
import { RawEvent, Unsigned } from "./event"

declare global {
  interface Window {
    nostr?: {
      getPublicKey: () => Promise<PublicKey>
      signEvent: <T extends RawEvent>(event: Unsigned<T>) => Promise<T>

      // TODO It's unclear to me if I should use this anywhere.
      getRelays?: () => Promise<{
        [url: string]: { read: boolean; write: boolean }
      }>

      nip04?: {
        encrypt?: (pubkey: PublicKey, plaintext: string) => Promise<string>
        decrypt?: (pubkey: PublicKey, ciphertext: string) => Promise<string>
      }
    }
  }
}
