import { describe, expect, test } from "bun:test"

import { GiftsCache } from "../src/Cache"
import { Nip17Chats } from "../src/chat/nip17"

const publisher = {} as never

describe("gift wrap processing", () => {
  test("a missing event in the relay batch does not crash the messages page", async () => {
    const batch = [undefined, null] as never
    await expect(GiftsCache.onEvent(batch, "", publisher)).resolves.toBeUndefined()
    await expect(Nip17Chats.processEvents(publisher, batch)).resolves.toBeUndefined()
  })
})
