import { Nostr } from "../src/client"
import { unixTimestamp } from "../src/util"

export const relayUrl = new URL("ws://localhost:12648")

export interface Setup {
  publisher: Nostr
  publisherSecret: string
  publisherPubkey: string
  subscriber: Nostr
  subscriberSecret: string
  subscriberPubkey: string
  timestamp: number
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
        "nsec15fnff4uxlgyu79ua3l7327w0wstrd6x565cx6zze78zgkktmr8vs90j363",
      publisherPubkey:
        "npub1he978sxy7tgc7yfp2zra05v045kfuqnfl3gwr82jd00mzxjj9fjqzw2dg7",
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
  // Make a request to the endpoint which will crash the process and cause it to restart.
  try {
    await fetch("http://localhost:12649")
  } catch (e) {
    // Since the process exits, an error is expected.
  }

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
