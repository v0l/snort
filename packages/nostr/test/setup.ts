import { Nostr } from "../src/client"
import { unixTimestamp } from "../src/util"

export interface Setup {
  publisher: Nostr
  publisherSecret: string
  publisherPubkey: string
  subscriber: Nostr
  subscriberSecret: string
  subscriberPubkey: string
  timestamp: number
  url: URL
}

export async function setup(done: jest.DoneCallback): Promise<Setup> {
  await restartRelay()
  const publisher = new Nostr()
  const subscriber = new Nostr()
  const url = new URL("ws://localhost:12648")

  publisher.on("error", done)
  subscriber.on("error", done)

  publisher.open(url)
  subscriber.open(url)

  return {
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
    url,
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
      nostr.open("ws://localhost:12648")
    })
    if (ok) {
      break
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}
