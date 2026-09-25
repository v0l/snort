import { EventKind, expect, expectPublished, tagValues, test } from "./support/test"
import { alice, bob, carol, dave, Hashtag } from "./support/world"

test.beforeEach(async ({ login }) => {
  await login()
})

test.describe("feeds", () => {
  test("following only shows followed authors", async ({ page }) => {
    await page.goto("/following")
    await expect(page.getByText("Hello from Bob").first()).toBeVisible()
    await expect(page.getByText("Welcome to nostr").first()).toBeVisible()
    await expect(page.locator("main, #root").getByText("A stranger also likes")).toHaveCount(1)
  })

  test("tab menu switches feeds", async ({ page }) => {
    await page.goto("/following")
    await page.locator("header").getByRole("button", { name: "Following" }).click()
    for (const tab of [
      "For you",
      "Trending Notes",
      "Conversations",
      "Followed by friends",
      "Trending Hashtags",
      "Media",
    ]) {
      await expect(page.getByText(tab, { exact: true }).last()).toBeVisible()
    }
    await page.getByText("Conversations", { exact: true }).last().click()
    await expect(page).toHaveURL(/\/conversations$/)
  })

  test("topics shows followed hashtags", async ({ page }) => {
    await page.goto("/topics")
    await expect(page.getByText("A stranger also likes").first()).toBeVisible()
  })

  test("relay feed", async ({ page }) => {
    await page.goto("/relay/relay.snort.test")
    await expect(page.locator("header").getByText("relay.snort.test")).toBeVisible()
    await expect(page.getByText("Great post Bob!").first()).toBeVisible()
  })
})

test.describe("profiles", () => {
  test("followed user", async ({ page }) => {
    await page.goto(`/p/${bob.npub}`)
    await expect(page.getByRole("heading", { name: `${bob.displayName} follows you` })).toBeVisible()
    await expect(page.getByRole("button", { name: "Unfollow" })).toBeVisible()
  })

  test("tabs", async ({ page }) => {
    await page.goto(`/p/${bob.npub}`)
    await page.getByText("Followers", { exact: true }).click()
    await expect(page.getByText(alice.displayName).first()).toBeVisible()
    await expect(page.getByText(carol.displayName).first()).toBeVisible()
    await page.getByText("Follows", { exact: true }).click()
    await expect(page.getByText(alice.displayName).first()).toBeVisible()
    for (const tab of ["Reactions", "Zaps", "Relays", "Bookmarks", "Notes"]) {
      await page.getByText(tab, { exact: true }).click()
    }
    await expect(page.getByText("Hello from Bob").first()).toBeVisible()
  })

  test("follow keeps existing follows", async ({ page, relay }) => {
    await page.goto(`/p/${dave.npub}`)
    await page.getByRole("button", { name: "Follow", exact: true }).click()
    const ev = await expectPublished(relay, e => e.kind === EventKind.ContactList && e.pubkey === alice.pubkey)
    expect(tagValues(ev, "p").sort()).toEqual([bob.pubkey, carol.pubkey, dave.pubkey].sort())
    await expect(page.getByRole("button", { name: "Unfollow" })).toBeVisible()
  })

  test("unfollow", async ({ page, relay }) => {
    await page.goto(`/p/${bob.npub}`)
    await page.getByRole("button", { name: "Unfollow" }).click()
    const ev = await expectPublished(relay, e => e.kind === EventKind.ContactList && e.pubkey === alice.pubkey)
    expect(tagValues(ev, "p")).toEqual([carol.pubkey])
  })

  test("own profile links to settings", async ({ page }) => {
    await page.goto(`/p/${alice.npub}`)
    await page.getByRole("button", { name: "Edit" }).click()
    await expect(page).toHaveURL(/\/settings\/profile$/)
  })
})

test("notifications", async ({ page }) => {
  await page.goto("/notifications")
  await expect(page.getByText("Welcome to nostr")).toBeVisible()
  await expect(page.getByText(`${bob.displayName} liked`)).toBeVisible()
  await expect(page.getByText("Alice's first post").first()).toBeVisible()
})

test.describe("messages", () => {
  test("lists and opens the chat", async ({ page, world }) => {
    await page.goto("/messages")
    const chat = page.getByText(bob.displayName).first()
    await expect(chat).toBeVisible()
    await chat.click()
    await expect(page).toHaveURL(/\/messages\/.+/)
    await expect(page.getByText(world.dmText)).toBeVisible()
  })

  test("sends a gift wrapped reply", async ({ page, relay }) => {
    await page.goto("/messages")
    await page.getByText(bob.displayName).first().click()
    const input = page.locator("textarea.rta__textarea:visible")
    await input.fill("Hi Bob, got it")
    await input.press("Enter")
    await expect(page.getByText("Hi Bob, got it")).toBeVisible()
    await expect
      .poll(
        () =>
          relay.published
            .filter(e => e.kind === EventKind.GiftWrap)
            .flatMap(e => tagValues(e, "p"))
            .sort(),
        {
          timeout: 30_000,
        },
      )
      .toEqual([alice.pubkey, bob.pubkey].sort())
  })
})

test.describe("hashtags", () => {
  test("trending hashtags shows follow state", async ({ page }) => {
    await page.goto("/trending/hashtags")
    await expect(page.getByRole("link", { name: `#${Hashtag}` })).toBeVisible()
    await expect(page.getByText("42 notes")).toBeVisible()
    await expect(page.getByRole("button", { name: "Unfollow" })).toBeVisible()
  })

  test("follow a new hashtag keeps existing ones", async ({ page, relay }) => {
    await page.goto("/t/cats")
    await page.getByRole("button", { name: "Follow", exact: true }).click()
    const ev = await expectPublished(relay, e => e.kind === EventKind.InterestsList && e.pubkey === alice.pubkey)
    expect(tagValues(ev, "t").sort()).toEqual(["cats", Hashtag])
    await expect(page.getByRole("button", { name: "Unfollow" })).toBeVisible()
  })

  test("unfollow a hashtag", async ({ page, relay }) => {
    await page.goto(`/t/${Hashtag}`)
    await page.getByRole("button", { name: "Unfollow" }).click()
    const ev = await expectPublished(relay, e => e.kind === EventKind.InterestsList && e.pubkey === alice.pubkey)
    expect(tagValues(ev, "t")).toEqual([])
  })
})
