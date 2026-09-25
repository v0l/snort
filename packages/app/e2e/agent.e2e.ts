import type { Page } from "@playwright/test"
import { NostrLink } from "@snort/system"

import { EventKind, expect, expectPublished, noteCard, test } from "./support/test"
import { alice, bob } from "./support/world"

test.beforeEach(async ({ login }) => {
  await login()
})

async function ask(page: Page, text: string) {
  await page.goto("/agent")
  await page.getByPlaceholder("Ask me anything...").fill(text)
  await page.getByRole("button", { name: "Send" }).click()
}

test("create_event drafts a note the user can post", async ({ page, http, relay }) => {
  http.aiScript = [
    { tool: "create_event", args: { content: "Drafted by the agent", kind: EventKind.TextNote } },
    { text: "Here is your draft." },
  ]
  await ask(page, "write a note")
  await expect(page.getByText("Here is your draft.")).toBeVisible()
  await expect(noteCard(page, "Drafted by the agent")).toBeVisible()
  expect(relay.published.some(e => e.content === "Drafted by the agent")).toBe(false)
  await page.getByRole("button", { name: "Post Event" }).click()
  const ev = await expectPublished(relay, e => e.content === "Drafted by the agent")
  expect(ev.pubkey).toBe(alice.pubkey)
})

test("update_profile keeps the fields it was not asked to change", async ({ page, http, relay }) => {
  http.aiScript = [
    {
      tool: "update_profile",
      args: { displayName: null, bio: "Bio from the agent", avatarUrl: null, bannerUrl: null, website: null },
    },
    { text: "Updated." },
  ]
  await ask(page, "change my bio")
  await expect(page.getByText("Updated.")).toBeVisible()
  await page.getByRole("button", { name: "Post Event" }).click()
  const ev = await expectPublished(relay, e => e.kind === EventKind.SetMetadata && e.pubkey === alice.pubkey)
  const profile = JSON.parse(ev.content)
  expect(profile.about).toBe("Bio from the agent")
  expect(profile.name).toBe(alice.name)
  expect(profile.display_name).toBe(alice.displayName)
  expect(profile.nip05).toBe(`${alice.name}@snort.test`)
  expect(profile.lud16).toBe(`${alice.name}@snort.test`)
})

test("query_nostr shows the events it found", async ({ page, http }) => {
  http.aiScript = [
    { tool: "query_nostr", args: { filters: [{ authors: [bob.pubkey], kinds: [EventKind.TextNote] }] } },
    { text: "Bob has been busy." },
  ]
  await ask(page, "what has bob posted?")
  await expect(page.getByText(/Found [1-9]\d* events!/)).toBeVisible()
  await expect(page.locator("pre", { hasText: "Hello from Bob" })).toBeVisible()
  await expect(page.getByText("Bob has been busy.")).toBeVisible()
})

test("link tools decode and encode", async ({ page, http, world }) => {
  const link = NostrLink.fromEvent(world.notes.bobHello)
  http.aiScript = [
    { tool: "decode_nostr_link", args: { linkString: link.encode() } },
    { tool: "encode_nostr_link", args: { linkType: "npub", linkId: bob.pubkey } },
    { text: "Done." },
  ]
  await ask(page, "decode this")
  await expect(page.getByText("Done.")).toBeVisible()
  await expect(page.locator("pre", { hasText: world.notes.bobHello.id }).last()).toBeVisible()
  await expect(page.getByText(bob.npub).last()).toBeVisible()
})

test("model selector switches the model used for chat", async ({ page, http }) => {
  await page.goto("/agent")
  const model = page.getByRole("combobox")
  await expect(model.locator("option")).toHaveText(["snort-test", "snort-test-large"])
  await model.selectOption("snort-test-large")
  await page.getByPlaceholder("Ask me anything...").fill("who is bob?")
  await page.getByRole("button", { name: "Send" }).click()
  await expect(page.getByText("I found")).toBeVisible()
  expect(http.aiRequests.at(-1)?.model).toBe("snort-test-large")

  await page.reload()
  await expect(model).toHaveValue("snort-test-large")
  await page.getByPlaceholder("Ask me anything...").fill("who is bob?")
  await page.getByRole("button", { name: "Send" }).click()
  await expect.poll(() => http.aiRequests.length).toBe(4)
  expect(http.aiRequests.at(-1)?.model).toBe("snort-test-large")
})
