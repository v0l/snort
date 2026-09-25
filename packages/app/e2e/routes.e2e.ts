import { NostrLink } from "@snort/system"

import { expect, test } from "./support/test"
import { bob, carol } from "./support/world"

const publicRoutes = [
  "/trending/notes",
  "/trending/hashtags",
  "/discover",
  "/t/snorttest",
  "/tag/snorttest",
  "/relay/relay.snort.test",
  "/search",
  "/search/bob",
  "/about",
  "/help",
  "/changelog",
  "/nostr-address",
  "/free-nostr-address",
  "/cache-debug",
  "/bob",
  `/p/${bob.npub}`,
  `/${NostrLink.profile(carol.pubkey).encode()}`,
  "/does-not-exist",
  "/zap-pool",
  "/subscribe",
  "/subscribe/manage",
]

const privateRoutes = [
  "/following",
  "/for-you",
  "/followed-by-friends",
  "/conversations",
  "/media",
  "/suggested",
  "/topics",
  "/follow-sets",
  "/agent",
  "/notifications",
  "/messages",
  "/wallet",
  "/wallet/receive",
  "/wallet/send",
  "/settings",
  "/settings/profile",
  "/settings/relays",
  "/settings/preferences",
  "/settings/notifications",
  "/settings/moderation",
  "/settings/media",
  "/settings/keys",
  "/settings/accounts",
  "/settings/cache",
  "/settings/invite",
  "/settings/handle",
  "/settings/tools",
  "/settings/tools/prune-follows",
  "/settings/tools/follows-relay-health",
  "/settings/tools/sync-account",
  "/settings/wallet",
  "/settings/wallet/nwc",
  "/settings/wallet/lndhub",
  "/settings/wallet/alby",
]

async function expectHealthyPage(page: import("@playwright/test").Page) {
  await expect(page.getByRole("link", { name: "Home" })).toBeVisible()
  await expect(page.getByText("An error has occured!")).toHaveCount(0)
  await expect(page.getByText("Something went wrong.")).toHaveCount(0)
}

test.describe("every route renders logged out", () => {
  for (const route of publicRoutes) {
    test(route, async ({ page }) => {
      await page.goto(route)
      await expectHealthyPage(page)
    })
  }
})

test.describe("every route renders logged in", () => {
  for (const route of [...publicRoutes, ...privateRoutes]) {
    test(route, async ({ page, login }) => {
      await login()
      await page.goto(route)
      await expectHealthyPage(page)
    })
  }
})

test("component debug page", async ({ page }) => {
  await page.goto("/component-debug")
  await expect(page.getByRole("heading", { name: "Markdown", exact: true })).toBeVisible()
})
