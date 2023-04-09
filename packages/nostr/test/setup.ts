import "../src/nostr-object"
import { Nostr } from "../src/client"
import { Timestamp, unixTimestamp } from "../src/common"
import {
  aesDecryptBase64,
  aesEncryptBase64,
  parsePrivateKey,
  parsePublicKey,
  PublicKey,
} from "../src/crypto"
import { RawEvent } from "../src"
import { signEvent, Unsigned } from "../src/event"

export const relayUrl = new URL("ws://localhost:12648")

export interface Setup {
  publisher: Nostr
  publisherSecret?: string
  publisherPubkey: string
  subscriber: Nostr
  subscriberSecret: string
  subscriberPubkey: string
  timestamp: Timestamp
  url: URL
  /**
   * Signal that the test is done. Call this instead of the callback provided by
   * mocha. This will also take care of test cleanup.
   */
  done: (e?: unknown) => void
}

export async function setup(
  done: jest.DoneCallback,
  test: (setup: Setup) => void | Promise<void>
) {
  try {
    await restartRelay()

    const publisherPubkey =
      "npub1he978sxy7tgc7yfp2zra05v045kfuqnfl3gwr82jd00mzxjj9fjqzw2dg7"
    const publisherSecret =
      "nsec15fnff4uxlgyu79ua3l7327w0wstrd6x565cx6zze78zgkktmr8vs90j363"

    // Set up the global window.nostr object for the publisher.
    if (typeof window !== "undefined") {
      if (window.location.pathname === "/nostr-object") {
        window.nostr = {
          getPublicKey: () => Promise.resolve(parsePublicKey(publisherPubkey)),
          signEvent: <T extends RawEvent>(event: Unsigned<T>) =>
            signEvent(event, publisherSecret),

          getRelays: () => Promise.resolve({}),

          nip04: {
            encrypt: async (pubkey: PublicKey, plaintext: string) => {
              const { data, iv } = await aesEncryptBase64(
                parsePrivateKey(publisherSecret),
                pubkey,
                plaintext
              )
              return `${data}?iv=${iv}`
            },
            decrypt: async (pubkey: PublicKey, ciphertext: string) => {
              const [data, iv] = ciphertext.split("?iv=")
              return await aesDecryptBase64(
                pubkey,
                parsePrivateKey(publisherSecret),
                {
                  data,
                  iv,
                }
              )
            },
          },
        }
      } else {
        // Otherwise, disable the user's nostr extension if they have one.
        window.nostr = undefined
      }
    }

    const publisher = new Nostr()
    const subscriber = new Nostr()

    publisher.on("error", done)
    subscriber.on("error", done)

    const openPromise = Promise.all([
      new Promise((resolve) => publisher.on("open", resolve)),
      new Promise((resolve) => subscriber.on("open", resolve)),
    ])

    publisher.open(relayUrl)
    subscriber.open(relayUrl)

    await openPromise

    const result = test({
      publisher,
      publisherSecret:
        typeof window === "undefined" || window.nostr === undefined
          ? publisherSecret
          : undefined,
      publisherPubkey,
      subscriber,
      subscriberSecret:
        "nsec1fxvlyqn3rugvxwaz6dr5h8jcfn0fe0lxyp7pl4mgntxfzqr7dmgst7z9ps",
      subscriberPubkey:
        "npub1mtwskm558jugtj724nsgf3jf80c5adl39ttydngrn48250l6xmjqa00yxd",
      timestamp: unixTimestamp(),
      url: relayUrl,
      done: (e?: unknown) => {
        publisher.close()
        subscriber.close()
        done(e)
      },
    })
    if (result instanceof Promise) {
      await result
    }
  } catch (e) {
    done(e)
  }
}

async function restartRelay() {
  // Make a request to the endpoint which will exit the process and cause it to restart.
  await fetch("http://localhost:12649")

  // Wait until the relay process is ready.
  for (;;) {
    const ok = await new Promise((resolve) => {
      const nostr = new Nostr()
      nostr.on("error", () => {
        nostr.close()
        resolve(false)
      })
      nostr.on("open", () => {
        nostr.close()
        resolve(true)
      })
      nostr.open("ws://localhost:12648", { fetchInfo: false })
    })
    if (ok) {
      break
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}
