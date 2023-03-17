import assert from "assert"
import { Nostr } from "../src/client"
import { setup } from "./setup"

describe("relay info", async function () {
  it("fetching relay info", (done) => {
    setup(done, ({ publisher, done }) => {
      assert.strictEqual(publisher.relays.length, 1)
      const relay = publisher.relays[0]
      assert.strictEqual(relay.readyState, Nostr.OPEN)
      if (relay.readyState === Nostr.OPEN) {
        assert.strictEqual(relay.info.name, "nostr-rs-relay")
        assert.strictEqual(relay.info.description, "nostr-rs-relay description")
        assert.strictEqual(relay.info.pubkey, undefined)
        assert.strictEqual(relay.info.contact, "mailto:contact@example.com")
        assert.ok((relay.info.supported_nips?.length ?? 0) > 0)
        assert.strictEqual(
          relay.info.software,
          "https://git.sr.ht/~gheartsfield/nostr-rs-relay"
        )
        assert.strictEqual(relay.info.version, "0.8.8")
      }
      done()
    })
  })
})
