import { DeepReadonly } from "./common"
import { PublicKey } from "./crypto"
import { EventProps, UnsignedEventProps } from "./event"

declare global {
  interface Window {
    nostr?: {
      getPublicKey: () => Promise<PublicKey>
      signEvent: (
        event: DeepReadonly<UnsignedEventProps>
      ) => Promise<EventProps>

      getRelays?: () => Promise<
        Record<string, { read: boolean; write: boolean }>
      >

      nip04?: {
        encrypt?: (pubkey: PublicKey, plaintext: string) => Promise<string>
        decrypt?: (pubkey: PublicKey, ciphertext: string) => Promise<string>
      }
    }
  }
}
