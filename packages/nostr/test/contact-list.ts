import assert from "assert"
import { EventKind, signEvent } from "../src/event"
import { createContactList } from "../src/event/contact-list"
import { setup } from "./setup"

describe("contact-list", () => {
  it("publish and receive the contact list", (done) => {
    setup(done, ({ publisher, subscriber, subscriberSecret, done }) => {
      const contacts = [
        {
          pubkey:
            "db9df52f7fcaf30b2718ad17e4c5521058bb20b95073b5c4ff53221b36447c4f",
          relay: undefined,
          petname: undefined,
        },
        {
          pubkey:
            "94d5ce4cb06f67cab69a2f6e28e0a795222a74ac6a1dd6223743913cc99eaf37",
          relay: new URL("ws://example.com"),
          petname: undefined,
        },
        {
          pubkey:
            "e6e9a25dbf3e931c991f43c97378e294c25f59e88adc91eda11ed17249a00c20",
          relay: undefined,
          petname: "john",
        },
        {
          pubkey:
            "13d629a3a879f2157199491408711ff5e1450002a9f9d8b0ad750f1c6b96661d",
          relay: new URL("ws://example2.com"),
          petname: "jack",
        },
      ]

      subscriber.on("event", ({ event }) => {
        assert.strictEqual(event.kind, EventKind.ContactList)
        assert.strictEqual(event.content, "")
        if (event.kind === EventKind.ContactList) {
          assert.deepStrictEqual(event.getContacts(), contacts)
        }
        done()
      })

      subscriber.subscribe([])

      // After the subscription event sync is done, publish the test event.
      subscriber.on("eose", async () => {
        // TODO No signEvent, have a convenient way to do this
        publisher.publish(
          await signEvent(createContactList(contacts), subscriberSecret)
        )
      })
    })
  })
})
