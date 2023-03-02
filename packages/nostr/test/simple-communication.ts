import { EventParams, Nostr } from "../src/client"
import { EventKind } from "../src/event"
import { PrivateKey } from "../src/keypair"
import assert from "assert"

// TODO Switch out the relay implementation and see if the issue persists

describe("single event communication", function () {
  it("ok", function (done) {
    const secret = new PrivateKey(
      "nsec1xlu55y6fqfgrq448xslt6a8j2rh7lj08hyhgs94ryq04yf6surwsjl0kzh"
    )
    const pubkey = secret.pubkey

    const timestamp = new Date()
    const note = "hello world"

    const publisher = new Nostr()
    publisher.open("ws://localhost:12648")
    const subscriber = new Nostr()
    subscriber.open("ws://localhost:12648")

    function listener({ signed: { event } }: EventParams) {
      assert.equal(event.kind, EventKind.TextNote)
      assert.equal(event.pubkey.toString(), pubkey.toString())
      assert.equal(event.createdAt.toString(), timestamp.toString())
      if (event.kind === EventKind.TextNote) {
        assert.equal(event.content, note)
      }

      // There is a bug with the nostr relay used for testing where if the publish and
      // subscribe happen at the same time, the same event might end up being broadcast twice.
      // To prevent reacting to the same event and calling done() twice, remove the callback
      // for future events.
      subscriber.off("event", listener)

      publisher.close()
      subscriber.close()

      done()
    }

    subscriber.on("event", listener)

    subscriber.subscribe([])

    publisher.publish(
      {
        kind: EventKind.TextNote,
        createdAt: timestamp,
        content: note,
        pubkey,
      },
      secret
    )
  })
})
