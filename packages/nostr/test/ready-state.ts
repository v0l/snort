import assert from "assert"
import { Nostr } from "../src/client"
import { relayUrl } from "./setup"

describe("ready state", () => {
  it("ready state transitions", (done) => {
    const nostr = new Nostr()

    nostr.on("error", done)

    nostr.on("open", () => {
      assert.strictEqual(nostr.relays[0].readyState, Nostr.OPEN)
      nostr.close()
    })

    nostr.on("close", () => {
      assert.strictEqual(nostr.relays[0].readyState, Nostr.CLOSED)
      done()
    })

    nostr.open(relayUrl)
    assert.strictEqual(nostr.relays[0].readyState, Nostr.CONNECTING)
  })
})
