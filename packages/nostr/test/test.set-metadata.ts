import { assert } from "chai"
import { EventKind } from "../src/event"
import { parsePublicKey } from "../src/crypto"
import { setup } from "./setup"
import { SetMetadata } from "../src/event/kind/set-metadata"

describe("set metadata", () => {
  const name = "bob"
  const about = "this is bob"
  const picture = "https://example.com/bob.jpg"

  // Test that a set metadata event can be published by one client and received by the other.
  it("publish and receive", (done) => {
    setup(
      done,
      ({
        publisher,
        publisherSecret,
        publisherPubkey,
        subscriber,
        timestamp,
        done,
      }) => {
        // Expect the test event.
        subscriber.on("event", ({ event }) => {
          assert.strictEqual(event.kind, EventKind.SetMetadata)
          if (event.kind === EventKind.SetMetadata) {
            const user = event.userMetadata
            assert.strictEqual(event.pubkey, parsePublicKey(publisherPubkey))
            assert.strictEqual(event.created_at, timestamp)
            assert.strictEqual(event.tags.length, 0)
            assert.strictEqual(user.name, name)
            assert.strictEqual(user.about, about)
            assert.strictEqual(user.picture, picture)
          }
          done()
        })

        subscriber.subscribe([])

        // After the subscription event sync is done, publish the test event.
        subscriber.on("eose", async () => {
          await publisher.publish(
            await SetMetadata.create({
              userMetadata: { name, about, picture },
              priv: publisherSecret,
              base: {
                created_at: timestamp,
              },
            })
          )
        })
      }
    )
  })
})
