import { unixNow } from "@snort/shared"
import { EventBuilder, EventKind, type NostrEvent } from "@snort/system"

import type { FakeRelay } from "./support/relay"
import { expect, noteCard, test } from "./support/test"
import { alice, bob, carol, dave, type User } from "./support/world"

async function note(u: User, content: string, age: number, tags: Array<Array<string>> = []) {
  const eb = new EventBuilder()
    .kind(EventKind.TextNote)
    .content(content)
    .createdAt(unixNow() - age)
  for (const t of tags) eb.tag(t)
  return await eb.buildAndSign(u.signer)
}

async function seedLongFeed(relay: FakeRelay, count = 40) {
  for (let i = 0; i < count; i++) {
    relay.add(await note(bob, `Scroll note ${i}\n\nline two of note ${i}\n\nline three of note ${i}`, 60 * (i + 1)))
  }
}

async function scrollUntilVisible(page: import("@playwright/test").Page, text: string) {
  const target = noteCard(page, text)
  await expect(async () => {
    await page.mouse.wheel(0, 800)
    await expect(target).toBeVisible({ timeout: 300 })
  }).toPass({ timeout: 20_000 })
  await target.scrollIntoViewIfNeeded()
  return target
}

const feedY = (page: import("@playwright/test").Page) => page.evaluate(() => Math.round(scrollY))
const panes = (page: import("@playwright/test").Page) => page.getByRole("region", { name: "Open panes" })

test.describe("feed position", () => {
  test.beforeEach(async ({ login, relay }) => {
    await seedLongFeed(relay)
    await login()
  })

  test("back from an opened note returns to the same feed position", async ({ page }) => {
    await page.goto("/following")
    const target = await scrollUntilVisible(page, "line two of note 25")
    await expect.poll(() => feedY(page)).toBeGreaterThan(1500)
    const before = await target.boundingBox()

    await target.getByText("line two of note 25").click()
    await expect(page).toHaveURL(/nevent1|note1/)
    await page.goBack()

    await expect(page).toHaveURL(/\/following$/)
    await expect.poll(async () => (await target.boundingBox())?.y).toBeCloseTo(before?.y ?? -1, -1)
  })

  test("opening a note does not move the feed", async ({ page }) => {
    await page.goto("/following")
    const target = await scrollUntilVisible(page, "line two of note 20")
    const before = await target.boundingBox()
    const y = await feedY(page)

    await target.getByText("line two of note 20").click()
    await expect(panes(page).getByText("line three of note 20")).toBeVisible()

    expect(await feedY(page)).toBe(y)
    expect((await target.boundingBox())?.x).toBe(before?.x)
    expect((await target.boundingBox())?.y).toBe(before?.y)
  })

  test("a profile opened from a thread stacks beside it and back returns to the thread", async ({ page }) => {
    await page.goto("/following")
    const target = await scrollUntilVisible(page, "line two of note 3")
    await target.getByText("line two of note 3").click()
    const stack = panes(page)
    await expect(stack.getByText("line three of note 3")).toBeVisible()

    await stack
      .getByRole("link", { name: new RegExp(bob.displayName) })
      .first()
      .click()
    await expect(stack.getByText(`${bob.displayName} is a test account`)).toBeVisible()
    await expect(stack.getByText("line three of note 3")).toBeVisible()

    await page.goBack()
    await expect(stack.getByText(`${bob.displayName} is a test account`)).toBeHidden()
    await expect(stack.getByText("line three of note 3")).toBeVisible()
  })

  test("closing the pane goes back to the feed where it was", async ({ page }) => {
    await page.goto("/following")
    const target = await scrollUntilVisible(page, "line two of note 15")
    const y = await feedY(page)
    await target.getByText("line two of note 15").click()
    await expect(panes(page)).toBeVisible()

    await panes(page).getByRole("button", { name: "Close" }).click()
    await expect(page).toHaveURL(/\/following$/)
    await expect(panes(page)).toBeHidden()
    expect(await feedY(page)).toBe(y)
  })

  test("a note link opened directly is a full page", async ({ page, world }) => {
    await page.goto(`/e/${world.notes.bobHello.id}`)
    await expect(panes(page)).toBeHidden()
    await expect(page.locator("[data-feed-column]").getByText("Hello from Bob")).toBeVisible()
  })
})

test.describe("phone", () => {
  test("an opened note covers the feed and back reveals it unmoved", async ({ page, relay, login }) => {
    await seedLongFeed(relay)
    await login()
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/following")
    const target = await scrollUntilVisible(page, "line two of note 12")
    const y = await feedY(page)

    await target.getByText("line two of note 12").click()
    await expect(panes(page).getByText("line three of note 12")).toBeVisible()
    await page.goBack()

    await expect(panes(page)).toBeHidden()
    await expect.poll(() => feedY(page)).toBe(y)
  })
})

test.describe("welcome back", () => {
  test("returning after a break offers to jump to where you left off", async ({ page, relay, login }) => {
    await seedLongFeed(relay, 20)
    await login()
    const leftOff = unixNow() - 60 * 8 - 30
    await page.evaluate(({ key, mark }) => localStorage.setItem(key, JSON.stringify(mark)), {
      key: `snort:read:${alice.pubkey.slice(0, 16)}:follows`,
      mark: { readUntil: leftOff, previous: 0, savedAt: unixNow() - 7200 },
    })
    await page.goto("/following")

    const callout = page.getByRole("status").filter({ hasText: "Welcome back." })
    await expect(callout).toContainText("8 new notes since")
    await callout.getByRole("button", { name: "Jump to where you left off" }).click()

    const divider = page
      .locator("[data-feed-column]")
      .getByText(/You left off here at/)
      .first()
    await expect(divider).toBeInViewport()
    await expect(noteCard(page, "line two of note 8")).toBeInViewport()
  })

  test("a first visit shows no callout", async ({ page, relay, login }) => {
    await seedLongFeed(relay, 5)
    await login()
    await page.goto("/following")
    await expect(noteCard(page, "line two of note 0")).toBeVisible()
    await expect(page.getByText("Welcome back.")).toBeHidden()
  })
})

test.describe("worth a look", () => {
  test("a thread several follows are in is suggested with who is in it", async ({ page, relay, login }) => {
    const extra: Array<NostrEvent> = []
    const daveThread = await note(dave, "Dave asks: which relay do you run?", 3000)
    extra.push(daveThread)
    for (const u of [bob, carol]) {
      extra.push(
        await note(u, `${u.name} answers Dave`, 2000, [
          ["e", daveThread.id, "", "root"],
          ["p", dave.pubkey],
        ]),
      )
    }
    extra.push(
      await new EventBuilder()
        .kind(EventKind.ContactList)
        .createdAt(unixNow() - 100)
        .tag(["p", alice.pubkey])
        .tag(["p", dave.pubkey])
        .buildAndSign(bob.signer),
    )
    for (const e of extra) relay.add(e)
    const follows = await new EventBuilder()
      .kind(EventKind.ContactList)
      .createdAt(unixNow() - 100)
      .tag(["p", bob.pubkey])
      .tag(["p", carol.pubkey])
      .tag(["p", "1".repeat(64)])
      .tag(["p", "2".repeat(64)])
      .tag(["p", "3".repeat(64)])
      .buildAndSign(alice.signer)
    relay.add(follows)

    await login()
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto("/following")
    const card = page.locator("[data-worth-a-look]").filter({ hasText: "Dave asks: which relay do you run?" })
    await expect(card).toContainText("2 people you follow are in this thread")

    await card.click()
    await expect(panes(page).getByText("bob answers Dave")).toBeVisible()
  })
})
