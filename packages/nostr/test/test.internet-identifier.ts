import { assert } from "chai"
import { defined } from "../src/common"
import { EventKind } from "../src/event"
import { createSetMetadata } from "../src/event/set-metadata"
import { setup } from "./setup"

describe("internet-identifier", () => {
  it("present", (done) => {
    setup(done, ({ publisher, publisherSecret, subscriber, done }) => {
      subscriber.on("event", async ({ event }) => {
        // Assert that the internet identifier can be verified.
        assert.strictEqual(event.kind, EventKind.SetMetadata)
        if (event.kind === EventKind.SetMetadata) {
          const identifier = await event.verifyInternetIdentifier({
            https: false,
          })
          assert.ok(identifier)
          const { name, relays } = defined(identifier)
          assert.strictEqual(name, "bob")
          assert.deepStrictEqual(relays, ["ws://example.com"])
        }
        done()
      })

      subscriber.subscribe([])

      // After the subscription event sync is done, publish the test event.
      subscriber.on("eose", async () => {
        publisher.publish({
          ...(await createSetMetadata(
            {
              about: "",
              name: "",
              picture: "",
              nip05: "bob@localhost:12647",
            },
            publisherSecret,
          )),
        })
      })
    })
  })

  it("missing", (done) => {
    setup(done, ({ publisher, publisherSecret, subscriber, done }) => {
      subscriber.on("event", async ({ event }) => {
        // Assert that undefined is returned if the internet identifier is missing.
        assert.strictEqual(event.kind, EventKind.SetMetadata)
        if (event.kind === EventKind.SetMetadata) {
          const identifier = await event.verifyInternetIdentifier({
            https: false,
          })
          assert.strictEqual(identifier, undefined)
        }
        done()
      })

      subscriber.subscribe([])

      // After the subscription event sync is done, publish the test event.
      subscriber.on("eose", async () => {
        publisher.publish({
          ...(await createSetMetadata(
            {
              about: "",
              name: "",
              picture: "",
            },
            publisherSecret,
          )),
        })
      })
    })
  })
})
