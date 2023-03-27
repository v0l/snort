import { EventKind, signEvent, Unsigned } from "../src/event"
import { parsePublicKey } from "../src/crypto"
import assert from "assert"
import { setup } from "./setup"
import { createTextNote, TextNote } from "../src/event/text"

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

          // TODO No signEvent, have a convenient way to do this
          publisher.publish(
            await signEvent(
              {
                ...createTextNote(note),
                created_at: timestamp,
              } as Unsigned<TextNote>,
              publisherSecret
            )
          )
        })
      }
    )
  })

  // Test that a client interprets an "OK" message after publishing a text note.
  it("publish and ok", function (done) {
    setup(done, ({ publisher, publisherSecret, url, done }) => {
      // TODO No signEvent, have a convenient way to do this
      signEvent(createTextNote(note), publisherSecret).then((event) => {
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
})
