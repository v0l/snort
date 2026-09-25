import { RemoteProfile } from "./support/network"
import { EventKind, expect, expectPublished, icon, noteCard, openNoteCreator, tagValues, test } from "./support/test"
import { alice, BlossomServers, BobBlob, bob, erin, RelayUrl } from "./support/world"

test.beforeEach(async ({ page, login }) => {
  page.on("dialog", d => d.accept())
  await login()
  await page.goto("/following")
  await expect(page.getByText("Hello from Bob").first()).toBeVisible()
})

test.describe("composer", () => {
  test("publishes a note with hashtags", async ({ page, relay }) => {
    const editor = await openNoteCreator(page)
    await editor.fill("Posting from the e2e suite #playwright")
    await page.getByRole("button", { name: "Send", exact: true }).click()
    const ev = await expectPublished(relay, e => e.kind === EventKind.TextNote && e.pubkey === alice.pubkey)
    expect(ev.content).toBe("Posting from the e2e suite #playwright")
    expect(tagValues(ev, "t")).toContain("playwright")
    await expect(editor).toBeHidden()
  })

  test("emoji autocomplete", async ({ page }) => {
    const editor = await openNoteCreator(page)
    await editor.pressSequentially("hello :smil", { delay: 30 })
    const options = page.locator(".rta__list li")
    await expect(options.first()).toBeVisible()
    await editor.press("Enter")
    await expect(editor).not.toHaveValue(/:smil/)
  })

  test("mention autocomplete inserts a nostr link", async ({ page, relay }) => {
    const editor = await openNoteCreator(page)
    await editor.pressSequentially("hi @Bob", { delay: 30 })
    await expect(page.locator(".rta__list li", { hasText: bob.displayName })).toBeVisible()
    await editor.press("Enter")
    await expect(editor).toHaveValue(/^hi @nprofile1/)
    await page.getByRole("button", { name: "Send", exact: true }).click()
    const ev = await expectPublished(relay, e => e.kind === EventKind.TextNote && e.pubkey === alice.pubkey)
    expect(tagValues(ev, "p")).toContain(bob.pubkey)
  })

  test("mention autocomplete finds cached profiles after a reload", async ({ page }) => {
    await page.goto(`/p/${erin.npub}`)
    await expect(page.getByText(erin.displayName).first()).toBeVisible()
    await page.goto("/following")
    const editor = await openNoteCreator(page)
    await editor.pressSequentially("hi @eri", { delay: 30 })
    await expect(page.locator(".rta__list li", { hasText: erin.displayName })).toBeVisible()
  })

  test("mention autocomplete includes remote profile search", async ({ page, relay }) => {
    const editor = await openNoteCreator(page)
    await editor.pressSequentially("hi @fra", { delay: 30 })
    await expect(page.locator(".rta__list li", { hasText: RemoteProfile.display_name })).toBeVisible()
    await editor.press("Enter")
    await page.getByRole("button", { name: "Send", exact: true }).click()
    const ev = await expectPublished(relay, e => e.kind === EventKind.TextNote && e.pubkey === alice.pubkey)
    expect(tagValues(ev, "p")).toContain(RemoteProfile.pubkey)
  })

  test("preview renders the note", async ({ page }) => {
    const editor = await openNoteCreator(page)
    await editor.fill("Preview me #snorttest")
    await page.locator(".fixed").getByText("Preview", { exact: true }).locator("xpath=following-sibling::*[1]").click()
    await expect(page.locator(".fixed").getByRole("link", { name: "#snorttest" })).toBeVisible()
  })
})

test.describe("note actions", () => {
  test("like", async ({ page, relay, world }) => {
    await noteCard(page, "Hello from Bob").getByTitle("Like").click()
    const ev = await expectPublished(relay, e => e.kind === EventKind.Reaction && e.pubkey === alice.pubkey)
    expect(tagValues(ev, "e")).toContain(world.notes.bobHello.id)
    expect(tagValues(ev, "p")).toContain(bob.pubkey)
  })

  test("reply", async ({ page, relay, world }) => {
    await noteCard(page, "Hello from Bob").getByTitle("Reply").click()
    await expect(page.getByText("Reply To")).toBeVisible()
    const editor = page.locator(".fixed textarea").first()
    await editor.fill("Replying from e2e")
    await page.getByRole("button", { name: "Reply", exact: true }).click()
    const ev = await expectPublished(relay, e => e.content === "Replying from e2e")
    expect([EventKind.TextNote, EventKind.Comment]).toContain(ev.kind)
    expect(JSON.stringify(ev.tags)).toContain(world.notes.bobHello.id)
  })

  test("repost", async ({ page, relay, world }) => {
    await noteCard(page, "Hello from Bob").getByTitle("Repost").click()
    await page.getByRole("menuitem", { name: "Repost", exact: true }).click()
    const ev = await expectPublished(relay, e => e.kind === EventKind.Repost && e.pubkey === alice.pubkey)
    expect(tagValues(ev, "e")).toContain(world.notes.bobHello.id)
  })

  test("quote repost opens the composer with the quote", async ({ page }) => {
    await noteCard(page, "Hello from Bob").getByTitle("Repost").click()
    await page.getByRole("menuitem", { name: "Quote Repost" }).click()
    await expect(page.locator(".fixed textarea").first()).toBeVisible()
    await expect(page.locator(".fixed").getByText("Hello from Bob")).toBeVisible()
  })
})

test.describe("context menu", () => {
  const openMenu = async (page: import("@playwright/test").Page, text: string) => {
    await icon(noteCard(page, text), "dots").first().click()
  }

  test("lists the actions", async ({ page }) => {
    await openMenu(page, "Hello from Bob")
    for (const item of [
      "Reactions",
      "Share",
      "Pin",
      "Bookmark",
      "Copy ID",
      "Mute",
      "Broadcast Event",
      "Copy Event JSON",
    ]) {
      await expect(page.getByRole("menuitem", { name: item })).toBeVisible()
    }
    await expect(page.getByRole("menuitem", { name: "Delete" })).toHaveCount(0)
  })

  test("bookmark", async ({ page, relay, world }) => {
    await openMenu(page, "Hello from Bob")
    await page.getByRole("menuitem", { name: "Bookmark" }).click()
    const ev = await expectPublished(relay, e => e.kind === EventKind.BookmarksList && e.pubkey === alice.pubkey)
    expect(tagValues(ev, "e")).toEqual(expect.arrayContaining([world.notes.bobHello.id, world.notes.bobImage.id]))
  })

  test("pin", async ({ page, relay, world }) => {
    await openMenu(page, "Hello from Bob")
    await page.getByRole("menuitem", { name: "Pin" }).click()
    const ev = await expectPublished(relay, e => e.kind === EventKind.PinList && e.pubkey === alice.pubkey)
    expect(tagValues(ev, "e")).toEqual(expect.arrayContaining([world.notes.bobHello.id, world.notes.aliceFirst.id]))
  })

  test("mute the author", async ({ page, relay }) => {
    await openMenu(page, "Hello from Bob")
    await page.getByRole("menuitem", { name: "Mute" }).click()
    await expectPublished(relay, e => e.kind === EventKind.MuteList && e.pubkey === alice.pubkey)
    await expect(page.getByText("Hello from Bob")).toHaveCount(0)
  })

  test("reactions modal", async ({ page }) => {
    await openMenu(page, "Hello from Bob")
    await page.getByRole("menuitem", { name: "Reactions" }).click()
    await expect(page.getByText("Carol Writer").last()).toBeVisible()
  })

  test("broadcast event", async ({ page, relay, world }) => {
    await openMenu(page, "Hello from Bob")
    await page.getByRole("menuitem", { name: "Broadcast Event" }).click()
    const modal = page.locator(".fixed", { hasText: "Broadcast Event" }).last()
    await expect(modal.getByText(RelayUrl)).toBeVisible()
    await expect(modal.getByRole("checkbox")).toBeChecked()
    await modal.getByRole("button", { name: "Send" }).click()
    await expect(modal.getByText("duplicate: already have this event")).toBeVisible()
    expect(relay.published.map(e => e.id)).toContain(world.notes.bobHello.id)
    await modal.getByRole("button", { name: "Cancel" }).click()
    await expect(page.getByText("duplicate: already have this event")).toHaveCount(0)
  })

  test("report media sends a blossom report", async ({ page, http }) => {
    await page.goto(`/p/${bob.npub}`)
    await openMenu(page, "Fresh upload")
    await page.getByRole("menuitem", { name: "Report Media" }).click()
    const report = page.getByRole("button", { name: "Report Selected" })
    await expect(report).toBeDisabled()
    await page.locator("div.font-mono", { hasText: BobBlob }).click()
    await report.click()
    for (const server of BlossomServers) {
      await expect(page.locator("li", { hasText: new URL(server).origin })).toBeVisible()
    }
    const submit = page.getByRole("button", { name: "Submit Report" })
    await expect(submit).toBeDisabled()
    await page.getByPlaceholder(/Describe why you're reporting/).fill("not a cat")
    await submit.click()
    await expect(page.getByText("Report Results:")).toBeVisible()
    await expect.poll(() => http.reports.map(r => r.server).sort()).toEqual(BlossomServers.map(s => new URL(s).origin))
    const ev = http.reports[0].event
    expect(ev.kind).toBe(1984)
    expect(ev.pubkey).toBe(alice.pubkey)
    expect(ev.content).toBe("not a cat")
    expect(ev.tags).toContainEqual(["x", BobBlob, "media"])
  })

  test("report media is only offered for blossom media", async ({ page }) => {
    await openMenu(page, "Hello from Bob")
    await expect(page.getByRole("menuitem", { name: "Copy Event JSON" })).toBeVisible()
    await expect(page.getByRole("menuitem", { name: "Report Media" })).toHaveCount(0)
  })

  test("delete own note", async ({ page, relay, world }) => {
    await page.goto(`/p/${alice.npub}`)
    await openMenu(page, "Alice's first post")
    await page.getByRole("menuitem", { name: "Delete" }).click()
    const ev = await expectPublished(relay, e => e.kind === EventKind.Deletion)
    expect(tagValues(ev, "e")).toContain(world.notes.aliceFirst.id)
    await page.getByRole("link", { name: "Settings" }).first().click()
    await page.getByRole("link", { name: "Cache" }).click()
    await page.getByRole("button", { name: "Debug" }).click()
    await page.getByRole("button", { name: "Raw JSON" }).click()
    await page.getByPlaceholder('{"kinds": [1], "limit": 10}').fill(JSON.stringify({ authors: [alice.pubkey] }))
    await expect(async () => {
      await page.getByRole("button", { name: "Query" }).click()
      await expect(page.getByRole("heading", { name: /Results: [1-9]/ })).toBeVisible({ timeout: 1_000 })
    }).toPass()
    const results = page.getByRole("heading", { name: /Results:/ }).locator("xpath=../..")
    await expect(results.getByText(alice.displayName).first()).toBeVisible()
    await expect(results.getByText("Alice's first post")).toHaveCount(0)
  })
})
