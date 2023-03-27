import { Nostr } from "../src/client"
import { createTextNote, EventKind, signEvent } from "../src/event"
import { getPublicKey } from "../src/crypto"
import assert from "assert"
import { unixTimestamp } from "../src/util"

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
    subscriber.on("error", done)
    publisher.on("error", done)

    // Expect the test event.
    subscriber.on("event", ({ event }, nostr) => {
      assert.equal(nostr, subscriber)
      assert.equal(event.kind, EventKind.TextNote)
      assert.equal(event.pubkey, pubkey)
      assert.equal(event.created_at, timestamp)
      assert.equal(event.content, note)

      done()
    })

    const subscriptionId = subscriber.subscribe([])

    // After the subscription event sync is done, publish the test event.
    subscriber.on("eose", (id, nostr) => {
      assert.equal(nostr, subscriber)
      assert.equal(id, subscriptionId)

      signEvent(
        {
          ...createTextNote(note),
          tags: [],
        },
        secret
      ).then((event) => publisher.publish(event))
    })
  })

  // TODO Have a way to run the relay on-demand and then re-add this test
  /*
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
  */
})
