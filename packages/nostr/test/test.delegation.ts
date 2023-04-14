import { assert } from "chai"
import { EventKind } from "../src/event"
import { parsePublicKey } from "../src/crypto"
import { setup } from "./setup"
import { TextNote } from "../src/event/kind/text-note"
import { createDelegation, DelegationConditions } from "../src/event/delegation"
import { DeepReadonly, NostrError, unixTimestamp } from "../src/common"

const note = "hello world"

const timestamp = unixTimestamp()

const delegatorPubkey =
  "npub1h5hhn5420y6l3yeufv7m83c57x0n58mkx8aqfyetw2t323zc8cwssuj7ne"
const delegatorSecret =
  "nsec1cym0pjpf3ev2h2gp3r0fkgr2jn5qudm89yajsk2j2n6scga36wnsxkwt47"

describe("delegation", () => {
  // Test that a text note can be published in the name of the delegator.
  it("valid delegation", (done) => valid(done, { kinds: [EventKind.TextNote] }))

  // Test that a text note can be published in the name of the delegator in the case
  // where no delegation conditions specified.
  it("valid delegation: empty conditions", valid)

  // Test that an invalid delegation token is rejected.
  it("invalid delegation: bad token", (done) =>
    invalid(
      done,
      {
        // Valid conditions...
        conditions: "kind=1",
        // ...but a bogus token.
        token:
          "e6bdbcf5c35f2d6b624e5aca7f23d521741c4bc541bda1f6e91f498d17743eebe9d7958fb563faf15780c3e2ef6682ae4a5369b0ef2de689f093505ee4e73c9d",
      },
      "signature"
    ))

  // Test that an event is rejected if the delegation kind conditions forbid it.
  it("invalid delegation: bad kind", (done) =>
    invalid(done, { kinds: [EventKind.SetMetadata] }, "event kind"))

  // Test that an event is rejected if it's too far in the past because created_at conditions forbid it.
  it("invalid delegation: created_at> now", (done) =>
    invalid(
      done,
      { kinds: [EventKind.TextNote], after: timestamp },
      "event.created_at"
    ))

  // Test that an event is rejected if it's too far in the past because created_at conditions forbid it.
  it("invalid delegation: created_at> now + 10", (done) =>
    invalid(
      done,
      { kinds: [EventKind.TextNote], after: timestamp + 10 },
      "event.created_at"
    ))

  // Test that an event is accepted if it happens in the future.
  it("valid delegation: created_at> now - 10", (done) =>
    valid(done, { kinds: [EventKind.TextNote], after: timestamp - 10 }))

  // Test that an event is accepted if it happens in the future, without any kind conditions.
  it("valid delegation: created_at> now - 10 with no kind conditions", (done) =>
    valid(done, { after: timestamp - 10 }))

  // Test that an event is rejected if it's too far in the future because created_at conditions forbid it.
  it("invalid delegation: created_at< now", (done) =>
    invalid(
      done,
      { kinds: [EventKind.TextNote], before: timestamp },
      "event.created_at"
    ))

  // Test that an event is rejected if it's too far in the future because created_at conditions forbid it.
  it("invalid delegation: created_at< now - 10", (done) =>
    invalid(
      done,
      { kinds: [EventKind.TextNote], before: timestamp - 10 },
      "event.created_at"
    ))

  // Test that an event is accepted if it happens before the delegation deadline.
  it("valid delegation: created_at< now + 10", (done) =>
    valid(done, { kinds: [EventKind.TextNote], before: timestamp + 10 }))

  // Test that an event is accepted if it happens within the time frame in the delegation conditions.
  it("valid delegation: created_at> now - 10 and created_at< now + 10", (done) =>
    valid(done, { after: timestamp - 10, before: timestamp + 10 }))
})

/**
 * Test that a text note can be published in the name of the delegator with the
 * specified conditions.
 */
function valid(
  done: jest.DoneCallback,
  conditions?: DeepReadonly<Partial<DelegationConditions>>
) {
  setup(
    done,
    ({ publisher, publisherSecret, publisherPubkey, subscriber, done }) => {
      // Expect the test event.
      subscriber.on(
        "event",
        ({ event, subscriptionId: actualSubscriptionId }, nostr) => {
          // The author is delegated.
          assert.strictEqual(event.author, parsePublicKey(delegatorPubkey))
          assert.notStrictEqual(event.pubkey, event.author)

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

        await publisher.publish(
          await TextNote.create({
            note,
            priv: publisherSecret,
            base: { created_at: timestamp },
            delegation: await createDelegation(
              publisherPubkey,
              delegatorSecret,
              conditions
            ),
          })
        )
      })
    }
  )
}

function invalid(
  done: jest.DoneCallback,
  opts:
    | DeepReadonly<Partial<DelegationConditions>>
    | DeepReadonly<{ conditions: string; token: string }>,
  errorMsg: string
) {
  setup(done, ({ publisherSecret, publisherPubkey, subscriber, done }) => {
    // Nothing should be published.
    subscriber.on("ok", () => {
      assert.fail("nothing should be published")
    })

    subscriber.subscribe([])

    // After the subscription event sync is done, publish the test event.
    subscriber.on("eose", async () => {
      const delegation =
        "conditions" in opts
          ? { ...opts, delegator: publisherPubkey }
          : await createDelegation(publisherPubkey, delegatorSecret, opts)
      // Expect the event creation to fail, since the delegation is invalid.
      const err = await error(
        TextNote.create({
          note,
          priv: publisherSecret,
          base: { created_at: timestamp },
          delegation,
        })
      )

      assert.instanceOf(err, NostrError)
      assert.include(err?.message, "invalid delegation")
      assert.include(err?.message, errorMsg)

      done()
    })
  })
}

async function error(promise: Promise<unknown>): Promise<Error | undefined> {
  try {
    await promise
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error
    }
    return error
  }
  return undefined
}
