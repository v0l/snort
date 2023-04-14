import { assert } from "chai"
import { EventKind } from "../src/event"
import { parsePublicKey } from "../src/crypto"
import { setup } from "./setup"
import { TextNote } from "../src/event/kind/text-note"
import { Deletion } from "../src/event/kind/deletion"

describe("deletion", () => {
  // Test that a deletion event deletes existing events. Test that the deletion event
  // is propagated to subscribers.
  it("deletes existing events", (done) => {
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
        // The event ID to delete.
        let textNoteId: string
        // The deletion event ID.
        let deletionId: string

        // Expect the deletion event (and not the text note event).
        subscriber.on("event", ({ event }) => {
          assert.strictEqual(event.kind, EventKind.Deletion)
          assert.strictEqual(event.id, deletionId)
          assert.strictEqual(event.pubkey, parsePublicKey(publisherPubkey))
          assert.strictEqual(event.created_at, timestamp)
          assert.strictEqual(event.content, "")
          if (event.kind === EventKind.Deletion) {
            assert.deepStrictEqual(event.deletedEvents, [textNoteId])
          }
          done()
        })

        TextNote.create({
          note: "hello world",
          priv: publisherSecret,
          base: {
            created_at: timestamp,
          },
        })
          .then((textNote) => {
            textNoteId = textNote.id
            return publisher.publish(textNote)
          })
          .catch(done)

        publisher.on("ok", async ({ eventId, ok }) => {
          assert.strictEqual(ok, true)

          if (eventId === textNoteId) {
            // After the text note has been published, delete it.
            const deletion = await Deletion.create({
              events: [textNoteId],
              priv: publisherSecret,
            })
            deletionId = deletion.id
            await publisher.publish({
              ...deletion,
              created_at: timestamp,
            })
          }

          if (eventId === deletionId) {
            // After the deletion has been published, subscribe to the publisher.
            subscriber.subscribe([])
          }
        })
      }
    )
  })
})
