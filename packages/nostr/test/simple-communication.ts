import { Nostr } from "../src/client"
import { EventKind, SignedEvent } from "../src/event"
import { PrivateKey } from "../src/crypto"
import assert from "assert"
import { EventParams } from "../src/client/emitter"

// TODO Switch out the relay implementation and see if the issue persists
// TODO Do on("error", done) for all of these

describe("simple communication", function () {
  const secret = new PrivateKey(
    "nsec1xlu55y6fqfgrq448xslt6a8j2rh7lj08hyhgs94ryq04yf6surwsjl0kzh"
  )
  const pubkey = secret.pubkey
  const timestamp = new Date()
  const note = "hello world"
  const url = new URL("ws://localhost:12648")

  const publisher = new Nostr()
  const subscriber = new Nostr()

  beforeEach(() => {
    publisher.open(url)
    subscriber.open(url)
  })

  afterEach(() => {
    publisher.close()
    subscriber.close()
  })

  it("publish and receive", function (done) {
    function listener({ signed: { event } }: EventParams, nostr: Nostr) {
      assert.equal(nostr, subscriber)
      assert.equal(event.kind, EventKind.TextNote)
      assert.equal(event.pubkey.toHex(), pubkey.toHex())
      assert.equal(event.createdAt.toString(), timestamp.toString())
      if (event.kind === EventKind.TextNote) {
        assert.equal(event.content, note)
      }

      // There is a bug with the nostr relay used for testing where if the publish and
      // subscribe happen at the same time, the same event might end up being broadcast twice.
      // To prevent reacting to the same event and calling done() twice, remove the callback
      // for future events.
      subscriber.off("event", listener)

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

  it("publish and ok", function (done) {
    SignedEvent.sign(
      {
        kind: EventKind.TextNote,
        createdAt: timestamp,
        content: note,
        pubkey,
      },
      secret
    ).then((event) => {
      publisher.on("ok", (params, nostr) => {
        assert.equal(nostr, publisher)
        assert.equal(params.eventId.toHex(), event.eventId.toHex())
        assert.equal(params.relay.toString(), url.toString())
        assert.equal(params.ok, true)
        done()
      })
      publisher.on("error", done)
      publisher.publish(event)
    })
  })
})
