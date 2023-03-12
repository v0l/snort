import { createDirectMessage, EventKind, signEvent } from "../src/event"
import { parsePublicKey } from "../src/crypto"
import assert from "assert"
import { setup } from "./setup"

describe("dm", async function () {
  const message = "for your eyes only"

  // Test that the intended recipient can receive and decrypt the direct message.
  it("to intended recipient", (done) => {
    setup(done).then(
      ({
        publisher,
        publisherPubkey,
        publisherSecret,
        subscriber,
        subscriberPubkey,
        subscriberSecret,
        timestamp,
      }) => {
        // Expect the direct message.
        subscriber.on(
          "event",
          async ({ event, subscriptionId: actualSubscriptionId }, nostr) => {
            try {
              assert.equal(nostr, subscriber)
              assert.equal(event.kind, EventKind.DirectMessage)
              assert.equal(event.pubkey, parsePublicKey(publisherPubkey))
              assert.equal(actualSubscriptionId, subscriptionId)
              assert.ok(event.created_at >= timestamp)

              if (event.kind === EventKind.DirectMessage) {
                assert.equal(
                  event.getRecipient(),
                  parsePublicKey(subscriberPubkey)
                )
                assert.equal(await event.getMessage(subscriberSecret), message)
              }

              publisher.close()
              subscriber.close()

              done()
            } catch (e) {
              done(e)
            }
          }
        )

        const subscriptionId = subscriber.subscribe([])

        subscriber.on("eose", async () => {
          // TODO No signEvent, do something more convenient
          const event = await signEvent(
            await createDirectMessage({
              message,
              recipient: subscriberPubkey,
              priv: publisherSecret,
            }),
            publisherSecret
          )
          publisher.publish(event)
        })
      }
    )
  })

  // Test that an unintended recipient still receives the direct message event, but cannot decrypt it.
  it("to unintended recipient", (done) => {
    setup(done).then(
      ({
        publisher,
        publisherPubkey,
        publisherSecret,
        subscriber,
        subscriberSecret,
        timestamp,
      }) => {
        const recipientPubkey =
          "npub1u2dl3scpzuwyd45flgtm3wcjgv20j4azuzgevdpgtsvvmqzvc63sz327gc"

        // Expect the direct message.
        subscriber.on(
          "event",
          async ({ event, subscriptionId: actualSubscriptionId }, nostr) => {
            try {
              assert.equal(nostr, subscriber)
              assert.equal(event.kind, EventKind.DirectMessage)
              assert.equal(event.pubkey, parsePublicKey(publisherPubkey))
              assert.equal(actualSubscriptionId, subscriptionId)
              assert.ok(event.created_at >= timestamp)

              if (event.kind === EventKind.DirectMessage) {
                assert.equal(
                  event.getRecipient(),
                  parsePublicKey(recipientPubkey)
                )
                assert.strictEqual(
                  await event.getMessage(subscriberSecret),
                  undefined
                )
              }

              publisher.close()
              subscriber.close()

              done()
            } catch (e) {
              done(e)
            }
          }
        )

        const subscriptionId = subscriber.subscribe([])

        subscriber.on("eose", async () => {
          // TODO No signEvent, do something more convenient
          const event = await signEvent(
            await createDirectMessage({
              message,
              recipient: recipientPubkey,
              priv: publisherSecret,
            }),
            publisherSecret
          )
          publisher.publish(event)
        })
      }
    )
  })
})
