import { assert } from "chai"
import { EventKind } from "../src/event"
import { parsePublicKey } from "../src/crypto"
import { setup } from "./setup"
import { createDirectMessage } from "../src/event/direct-message"

describe("direct-message", () => {
  const message = "for your eyes only"

  // Test that the intended recipient can receive and decrypt the direct message.
  it("to intended recipient", (done) => {
    setup(
      done,
      ({
        publisher,
        publisherPubkey,
        publisherSecret,
        subscriber,
        subscriberPubkey,
        subscriberSecret,
        timestamp,
        done,
      }) => {
        // Expect the direct message.
        subscriber.on(
          "event",
          async ({ event, subscriptionId: actualSubscriptionId }, nostr) => {
            assert.strictEqual(nostr, subscriber)
            assert.strictEqual(event.kind, EventKind.DirectMessage)
            assert.strictEqual(event.pubkey, parsePublicKey(publisherPubkey))
            assert.strictEqual(actualSubscriptionId, subscriptionId)
            assert.ok(event.created_at >= timestamp)

            if (event.kind === EventKind.DirectMessage) {
              assert.strictEqual(
                event.getRecipient(),
                parsePublicKey(subscriberPubkey)
              )
              assert.strictEqual(
                await event.getMessage(subscriberSecret),
                message
              )
            }

            done()
          }
        )

        const subscriptionId = subscriber.subscribe([])

        subscriber.on("eose", async () => {
          const event = await createDirectMessage(
            {
              message,
              recipient: subscriberPubkey,
            },
            publisherSecret
          )
          publisher.publish(event)
        })
      }
    )
  })

  // Test that an unintended recipient still receives the direct message event, but cannot decrypt it.
  it("to unintended recipient", (done) => {
    setup(
      done,
      ({
        publisher,
        publisherPubkey,
        publisherSecret,
        subscriber,
        subscriberSecret,
        timestamp,
        done,
      }) => {
        const recipientPubkey =
          "npub1u2dl3scpzuwyd45flgtm3wcjgv20j4azuzgevdpgtsvvmqzvc63sz327gc"

        // Expect the direct message.
        subscriber.on(
          "event",
          async ({ event, subscriptionId: actualSubscriptionId }, nostr) => {
            try {
              assert.strictEqual(nostr, subscriber)
              assert.strictEqual(event.kind, EventKind.DirectMessage)
              assert.strictEqual(event.pubkey, parsePublicKey(publisherPubkey))
              assert.strictEqual(actualSubscriptionId, subscriptionId)
              assert.ok(event.created_at >= timestamp)

              if (event.kind === EventKind.DirectMessage) {
                assert.strictEqual(
                  event.getRecipient(),
                  parsePublicKey(recipientPubkey)
                )
                assert.strictEqual(
                  await event.getMessage(subscriberSecret),
                  undefined
                )
              }

              done()
            } catch (e) {
              done(e)
            }
          }
        )

        const subscriptionId = subscriber.subscribe([])

        subscriber.on("eose", async () => {
          // TODO No signEvent, do something more convenient
          const event = await createDirectMessage(
            {
              message,
              recipient: recipientPubkey,
            },
            publisherSecret
          )
          publisher.publish(event)
        })
      }
    )
  })
})
