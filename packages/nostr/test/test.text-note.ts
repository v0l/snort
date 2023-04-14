import { assert } from "chai"
import { EventKind } from "../src/event"
import { parsePublicKey } from "../src/crypto"
import { setup } from "./setup"
import { TextNote } from "../src/event/kind/text-note"

describe("text note", () => {
  const note = "hello world"

  // Test that a text note can be published by one client and received by the other.
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
        subscriber.on(
          "event",
          ({ event, subscriptionId: actualSubscriptionId }, nostr) => {
            assert.strictEqual(nostr, subscriber)
            assert.strictEqual(event.kind, EventKind.TextNote)
            assert.strictEqual(event.pubkey, parsePublicKey(publisherPubkey))
            assert.strictEqual(event.created_at, timestamp)
            assert.strictEqual(event.content, note)
            assert.strictEqual(actualSubscriptionId, subscriptionId)
            done()
          }
        )

        const subscriptionId = subscriber.subscribe([])

        // After the subscription event sync is done, publish the test event.
        subscriber.on("eose", async (id, nostr) => {
          assert.strictEqual(nostr, subscriber)
          assert.strictEqual(id, subscriptionId)

          publisher.publish(
            await TextNote.create({
              note,
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

  // Test that a client interprets an "OK" message after publishing a text note.
  it("publish and ok", function (done) {
    setup(done, async ({ publisher, publisherSecret, url, done }) => {
      const event = await TextNote.create({ note, priv: publisherSecret })
      publisher.on("ok", (params, nostr) => {
        assert.strictEqual(nostr, publisher)
        assert.strictEqual(params.eventId, event.id)
        assert.strictEqual(params.relay.toString(), url.toString())
        assert.strictEqual(params.ok, true)
        done()
      })
      publisher.publish(event)
    })
  })
})
