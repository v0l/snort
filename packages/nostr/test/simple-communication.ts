import { Nostr } from "../src/client"
import { createTextNote, EventKind, signEvent } from "../src/event"
import { getPublicKey } from "../src/crypto"
import assert from "assert"
import { EventParams } from "../src/client/emitter"
import { unixTimestamp } from "../src/util"

// TODO Switch out the relay implementation and see if the issue persists
// TODO Do on("error", done) for all of these

describe("simple communication", function () {
  const secret =
    "nsec1xlu55y6fqfgrq448xslt6a8j2rh7lj08hyhgs94ryq04yf6surwsjl0kzh"
  const pubkey = getPublicKey(secret)
  const note = "hello world"
  const url = new URL("ws://localhost:12648")
  const timestamp = unixTimestamp()

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
    function listener({ event }: EventParams, nostr: Nostr) {
      assert.equal(nostr, subscriber)
      assert.equal(event.kind, EventKind.TextNote)
      assert.equal(event.pubkey, pubkey)
      assert.equal(event.created_at, timestamp)
      assert.equal(event.content, note)

      // There is a bug with the nostr relay used for testing where if the publish and
      // subscribe happen at the same time, the same event might end up being broadcast twice.
      // To prevent reacting to the same event and calling done() twice, remove the callback
      // for future events.
      subscriber.off("event", listener)

      done()
    }

    // TODO do this once EOSE is implemented
    //subscriber.on("error", done)
    //publisher.on("error", done)

    subscriber.on("event", listener)
    subscriber.subscribe([])
    signEvent(
      {
        ...createTextNote(note),
        tags: [],
      },
      secret
    ).then((event) => publisher.publish(event))
  })

  it("publish and ok", function (done) {
    signEvent(
      {
        ...createTextNote(note),
        tags: [],
      },
      secret
    ).then((event) => {
      publisher.on("ok", (params, nostr) => {
        assert.equal(nostr, publisher)
        assert.equal(params.eventId, event.id)
        assert.equal(params.relay.toString(), url.toString())
        assert.equal(params.ok, true)
        done()
      })
      publisher.on("error", done)
      publisher.publish(event)
    })
  })
})
