import { EventKind } from "../src/event"
import { parsePublicKey } from "../src/crypto"
import assert from "assert"
import { setup } from "./setup"
import { createTextNote } from "../src/event/text"
import { createDeletion } from "../src/event/deletion"

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
            assert.deepStrictEqual(event.getEvents(), [textNoteId])
          }
          done()
        })

        createTextNote("hello world", publisherSecret).then((textNote) => {
          textNoteId = textNote.id
          publisher.publish({
            ...textNote,
            created_at: timestamp,
          })
        })

        publisher.on("ok", async ({ eventId, ok }) => {
          assert.strictEqual(ok, true)

          if (eventId === textNoteId) {
            // After the text note has been published, delete it.
            const deletion = await createDeletion(
              { events: [textNoteId] },
              publisherSecret
            )
            deletionId = deletion.id
            publisher.publish({
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
