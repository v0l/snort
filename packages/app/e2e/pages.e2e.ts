import { EventKind, expect, expectPublished, test } from "./support/test"
import { alice, bob, freshDvm } from "./support/world"

test.beforeEach(async ({ login }) => {
  await login()
})

test("discover tabs", async ({ page }) => {
  await page.goto("/discover")
  for (const tab of ["Popular", "Followed By Friends", "Follow Sets", "Suggested Follows", "Search"]) {
    await expect(page.getByText(tab, { exact: true }).first()).toBeVisible()
  }
  await expect(page.getByText("Recent content that people you follow have reacted to.")).toBeVisible()
})

test("wallet overview", async ({ page }) => {
  await page.goto("/wallet")
  await expect(page.getByRole("button", { name: "Connect Wallet" })).toBeVisible()
  await expect(page.getByText("Connect a wallet to send instant payments")).toBeVisible()
  await page.getByRole("button", { name: "Connect Wallet" }).click()
  await expect(page).toHaveURL(/\/settings\/wallet$/)
})

test("wallet send form", async ({ page }) => {
  await page.goto("/wallet/send")
  await expect(page.getByPlaceholder("Invoice / Lightning Address")).toBeVisible()
  await expect(page.getByRole("button", { name: "Pay" })).toBeVisible()
})

test("wallet receive form", async ({ page }) => {
  await page.goto("/wallet/receive")
  await expect(page.getByRole("spinbutton")).toHaveValue("0")
  await expect(page.getByRole("button", { name: "Generate Invoice" })).toBeVisible()
})

test("agent page", async ({ page }) => {
  await page.goto("/agent")
  await expect(page.getByText("Ask me anything about Nostr or Snort")).toBeVisible()
  const send = page.getByRole("button", { name: "Send" })
  await expect(send).toBeDisabled()
  await page.getByPlaceholder("Ask me anything...").fill("hello")
  await expect(send).toBeEnabled()
})

test("new chat window", async ({ page }) => {
  await page.goto("/messages")
  await page.locator("button:right-of(:text('Mark all read'))").first().click()
  await expect(page.getByRole("heading", { name: "New Chat" })).toBeVisible()
  await expect(page.getByText("People you follow")).toBeVisible()
  await expect(page.getByText(bob.displayName).last()).toBeVisible()
})

test("trending provider can be switched and is saved", async ({ page, relay }) => {
  await page.goto("/following")
  const worth = page.locator("section", { has: page.getByRole("heading", { name: "Worth a look" }) })
  await expect(worth.getByText("Hello from Bob").first()).toBeVisible()
  await worth.getByRole("button", { name: "Popular notes provider" }).click()
  await expect(page.getByText("Select Provider")).toBeVisible()
  await page.getByText(freshDvm.displayName).click()

  const ev = await expectPublished(relay, e => e.kind === EventKind.AppData && e.pubkey === alice.pubkey)
  const data = JSON.parse(await alice.signer.nip44Decrypt(ev.content, alice.pubkey))
  expect(data.preferences.trendingDvmPubkey).toBe(freshDvm.pubkey)

  await page.reload()
  await expect(worth.getByText("Read this").first()).toBeVisible()
  await expect(worth.getByText("Hello from Bob")).toHaveCount(0)
})
