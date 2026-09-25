import { HandlePassword, TakenHandle, TestInvoice } from "./support/network"
import { EventKind, expect, expectPublished, test } from "./support/test"
import { alice, bob } from "./support/world"

test.beforeEach(async ({ login }) => {
  await login()
})

test("buy a nostr address and add it to the profile", async ({ page, http, relay }) => {
  await page.goto("/nostr-address")
  await expect(page.getByRole("heading", { name: "Buy nostr address" })).toBeVisible()
  const handle = page.getByPlaceholder("Handle")
  const domain = page.getByRole("combobox")
  await expect(domain).toHaveValue("snort.social")

  await handle.fill("a")
  await expect(page.getByText("Not available: name too short")).toBeVisible()
  await handle.fill("bad-name")
  await expect(page.getByText("Not available: name has disallowed characters")).toBeVisible()
  await handle.fill(TakenHandle)
  await expect(page.getByText("Not available: name is registered")).toBeVisible()

  await domain.selectOption("nostr.test")
  await handle.fill("alice_new")
  await expect(page.getByText("5K sats")).toBeVisible()
  await expect(page.getByText("(premium)")).toBeVisible()
  await page.getByRole("button", { name: "Buy Now" }).click()
  await expect(page.getByText("Buying alice_new@nostr.test")).toBeVisible()
  await expect(page.getByRole("link", { name: "Open Wallet" })).toHaveAttribute("href", `lightning:${TestInvoice}`)

  await expect(page.getByRole("heading", { name: "Order Paid!" })).toBeVisible({ timeout: 15_000 })
  await expect(page.locator("code", { hasText: "alice_new@nostr.test" })).toBeVisible()
  await expect(page.getByText(HandlePassword)).toBeVisible()
  const register = http.handleCalls.find(c => c.path === "/registration/register")
  expect(register?.body).toMatchObject({ name: "alice_new", domain: "nostr.test", pk: alice.pubkey })

  await page.getByRole("button", { name: "Add to Profile" }).click()
  const ev = await expectPublished(relay, e => e.kind === EventKind.SetMetadata && e.pubkey === alice.pubkey)
  expect(JSON.parse(ev.content).nip05).toBe("alice_new@nostr.test")
  await expect(page).toHaveURL(/\/settings\/profile$/)
})

test.describe("manage handles", () => {
  test.beforeEach(async ({ http }) => {
    http.handles = [
      { id: "h1", handle: "alice", domain: "snort.social", pubkey: alice.pubkey, created: new Date().toISOString() },
    ]
  })

  test("lists handles with a signed request", async ({ page, http }) => {
    await page.goto("/settings/handle")
    await expect(page.getByText("alice@snort.social")).toBeVisible()
    await expect(page.getByText("No handles found")).toHaveCount(0)
    const list = http.handleCalls.find(c => c.path === "/list")
    expect(list?.auth?.kind).toBe(EventKind.HttpAuthentication)
    expect(list?.auth?.pubkey).toBe(alice.pubkey)
    expect(list?.auth?.tags).toContainEqual(["method", "GET"])
  })

  test("update the lightning address", async ({ page, http }) => {
    await page.goto("/settings/handle")
    await page.getByRole("button", { name: "Manage" }).click()
    await expect(page.getByRole("heading", { name: "Update Lightning Address" })).toBeVisible()
    const address = page.getByPlaceholder("LNURL or Lightning Address")
    await address.fill("not a lightning address")
    await page.getByRole("button", { name: "Update" }).click()
    await expect(page.getByText("Invalid LNURL")).toBeVisible()
    await address.fill("bob@snort.test")
    await page.getByRole("combobox").selectOption("Proxy")
    await page.getByRole("button", { name: "Update" }).click()
    await expect
      .poll(() => http.handleCalls.find(c => c.method === "PATCH" && c.path === "/h1")?.body)
      .toEqual({ lnAddress: "bob@snort.test", forwardType: 1 })
    await expect(page.getByText("Invalid LNURL")).toHaveCount(0)
  })

  test("transfer to another key", async ({ page, http }) => {
    await page.goto("/settings/handle")
    await page.getByRole("button", { name: "Manage" }).click()
    await page.getByPlaceholder("Public key (npub/nprofile)").fill(bob.npub)
    await page.getByRole("button", { name: "Transfer" }).click()
    await expect(page).toHaveURL(/\/settings\/handle$/)
    const transfer = http.handleCalls.find(c => c.path.startsWith("/h1/transfer"))
    expect(transfer?.method).toBe("PATCH")
    expect(transfer?.query).toBe(`?to=${bob.npub}`)
  })
})

test("manage page without a handle goes back to the list", async ({ page }) => {
  await page.goto("/settings/handle/manage")
  await expect(page).toHaveURL(/\/settings\/handle$/)
})
