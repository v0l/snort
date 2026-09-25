import { NostrLink } from "@snort/system"

import { expect, test } from "./support/test"
import { bob, carol } from "./support/world"

test.describe("logged out", () => {
  test("home redirects to trending and shows the sidebar", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveURL(/\/trending\/notes$/)
    await expect(page.getByRole("heading", { name: "Snort", level: 1 })).toBeVisible()
    await expect(page.getByRole("link", { name: "Home" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Discover" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Sign up" })).toBeVisible()
    await expect(page.getByRole("button", { name: "New Note" })).toHaveCount(0)
    await expect(page.getByRole("link", { name: "Messages" })).toHaveCount(0)
  })

  test("sign up button opens sign up", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("button", { name: "Sign up" }).click()
    await expect(page).toHaveURL(/\/login\/sign-up$/)
    await expect(page.getByRole("heading", { name: "Sign Up" })).toBeVisible()
  })

  test("profile by npub", async ({ page }) => {
    await page.goto(`/p/${bob.npub}`)
    await expect(page.getByRole("heading", { name: bob.displayName, level: 2 })).toBeVisible()
    await expect(page.locator("header").getByText(bob.displayName)).toBeVisible()
    await expect(page.getByText(`${bob.displayName} is a test account`)).toBeVisible()
    await expect(page.getByRole("link", { name: "bob.snort.test" })).toBeVisible()
    await expect(page.getByText("Hello from Bob").first()).toBeVisible()
    await expect(page.getByText("Look at this cat").first()).toBeVisible()
  })

  test("profile by nprofile", async ({ page }) => {
    await page.goto(`/${NostrLink.profile(carol.pubkey).encode()}`)
    await expect(page.getByRole("heading", { name: carol.displayName, level: 2 })).toBeVisible()
    await expect(page.locator("header").getByText(carol.displayName)).toBeVisible()
    await expect(page.getByText("Great post Bob!")).toBeVisible()
    await expect(page.getByText(`${carol.displayName} reposted`)).toBeVisible()
  })

  test("profile by nostr address on the app domain", async ({ page }) => {
    await page.goto("/bob")
    await expect(page.getByRole("heading", { name: bob.displayName, level: 2 })).toBeVisible()
  })

  test("thread shows the note and its reply", async ({ page, world }) => {
    await page.goto(`/e/${NostrLink.fromEvent(world.notes.bobHello).encode()}`)
    await expect(page.locator("header").getByText(`Short Text Note by ${bob.displayName}`)).toBeVisible()
    await expect(page.getByText("Hello from Bob")).toBeVisible()
    await expect(page.getByText("Great post Bob!")).toBeVisible()
  })

  test("long form article renders markdown", async ({ page, world }) => {
    await page.goto(`/${NostrLink.fromEvent(world.notes.carolArticle).encode()}`)
    await expect(page.locator("header").getByText("Long-form Content by Carol Writer - Testing Snort")).toBeVisible()
    await expect(page.getByText("How the e2e suite works")).toBeVisible()
    await expect(page.getByRole("checkbox")).toHaveCount(2)
    await expect(page.getByRole("checkbox").nth(0)).not.toBeChecked()
    await expect(page.getByRole("checkbox").nth(1)).toBeChecked()
    await expect(page.locator("strong", { hasText: "bold" })).toBeVisible()
  })

  test("hashtag page lists tagged notes from everyone", async ({ page }) => {
    await page.goto("/t/snorttest")
    await expect(page.locator("header").getByText("#snorttest")).toBeVisible()
    await expect(page.getByText("Hello from Bob").first()).toBeVisible()
    await expect(page.getByText("A stranger also likes").first()).toBeVisible()
  })

  test("search finds notes", async ({ page }) => {
    await page.goto("/search/bob")
    await expect(page.getByRole("searchbox")).toHaveValue("bob")
    await expect(page.getByText("Great post").first()).toBeVisible()
  })

  test("search box navigates to the search page", async ({ page }) => {
    await page.goto("/trending/notes")
    await page.getByRole("textbox", { name: "Search" }).fill("cat")
    await page.getByRole("textbox", { name: "Search" }).press("Enter")
    await expect(page).toHaveURL(/\/search\/cat$/)
    await expect(page.getByText("Look at this cat").first()).toBeVisible()
  })

  test("list feed shows notes from list members", async ({ page, world }) => {
    await page.goto(`/list-feed/${NostrLink.fromEvent(world.notes.carolFollowSet).encode()}`)
    await expect(page.getByText("A stranger also likes").first()).toBeVisible()
    await expect(page.getByText("Hello from Bob")).toHaveCount(0)
  })

  test("about page", async ({ page }) => {
    await page.goto("/about")
    await expect(page.getByRole("heading", { name: "Donate" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Contributors" })).toBeVisible()
  })

  test("help page", async ({ page }) => {
    await page.goto("/help")
    await expect(page.getByRole("heading", { name: "NIP-05" })).toBeVisible()
  })

  test("unknown routes show not found inside the layout", async ({ page }) => {
    for (const path of ["/does-not-exist", "/some/nested/path"]) {
      await page.goto(path)
      await expect(page.getByText("Nothing found :/")).toBeVisible()
      await expect(page.getByRole("link", { name: "Home" })).toBeVisible()
    }
  })
})
