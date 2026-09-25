import { resolve } from "node:path"
import type { Page } from "@playwright/test"

import { EventKind, expect, expectPublished, icon, tagValues, test } from "./support/test"
import { alice, BlossomServers, bob, RelayUrl } from "./support/world"

const after = (page: Page, heading: string, selector: string) =>
  page.getByRole("heading", { name: heading, exact: true }).locator(`xpath=following::${selector}[1]`)

test.beforeEach(async ({ login }) => {
  await login()
})

test("settings menu links to every page", async ({ page }) => {
  const pages: Array<[string, RegExp]> = [
    ["Profile", /\/settings\/profile$/],
    ["Export Keys", /\/settings\/keys$/],
    ["Nostr Address", /\/settings\/handle$/],
    ["Preferences", /\/settings\/preferences$/],
    ["Wallet", /\/settings\/wallet$/],
    ["Tools", /\/settings\/tools$/],
    ["Relays", /\/settings\/relays$/],
    ["Moderation", /\/settings\/moderation$/],
    ["Cache", /\/settings\/cache$/],
  ]
  for (const [name, url] of pages) {
    await page.goto("/settings")
    await page.getByRole("link", { name, exact: true }).click()
    await expect(page).toHaveURL(url)
  }
})

test("profile edit publishes metadata", async ({ page, relay }) => {
  await page.goto("/settings/profile")
  await expect(after(page, "Name", "input")).toHaveValue(alice.name)
  await expect(after(page, "Nostr Address", "input")).toHaveValue(`${alice.name}@snort.test`)
  await after(page, "About", "textarea").fill("Updated by the e2e suite")
  await page.getByRole("button", { name: "Save" }).click()
  const ev = await expectPublished(relay, e => e.kind === EventKind.SetMetadata && e.pubkey === alice.pubkey)
  const profile = JSON.parse(ev.content)
  expect(profile.about).toBe("Updated by the e2e suite")
  expect(profile.name).toBe(alice.name)
  expect(profile.picture).toContain(`${alice.name}.png`)
})

test("profile fields validate addresses", async ({ page }) => {
  await page.goto("/settings/profile")
  const nip05 = after(page, "Nostr Address", "input")
  await expect(nip05).toHaveValue(`${alice.name}@snort.test`)
  await nip05.fill("no-at-sign")
  await expect(page.getByText("Invalid Nostr Address")).toBeVisible()
  await nip05.fill(`${bob.name}@snort.test`)
  await expect(page.getByText("Nostr address does not belong to you")).toBeVisible()
  await nip05.fill("nobody@snort.test")
  await expect(page.getByText("Invalid Nostr Address")).toBeVisible()
  await nip05.fill(`${alice.name}@snort.test`)
  await expect(page.getByText(/Invalid Nostr Address|does not belong/)).toHaveCount(0)

  const lud16 = after(page, "Lightning Address", "input")
  await lud16.fill("not a lightning address")
  await expect(page.getByText("Invalid Lightning Address")).toBeVisible()
  await lud16.fill(`${alice.name}@snort.test`)
  await expect(page.getByText("Invalid Lightning Address")).toHaveCount(0)
})

test("profile banner and avatar upload to blossom", async ({ page, relay, http }) => {
  await page.goto("/settings/profile")
  await expect(after(page, "Name", "input")).toHaveValue(alice.name)
  const image = resolve(import.meta.dirname, "../public/snort/nostrich_256.png")

  let chooser = page.waitForEvent("filechooser")
  await page.getByRole("button", { name: "Upload Banner" }).click()
  await (await chooser).setFiles(image)
  await expect.poll(() => http.uploads.length).toBe(1)

  chooser = page.waitForEvent("filechooser")
  await icon(page, "edit").first().click()
  await (await chooser).setFiles(image)
  await expect.poll(() => http.uploads.length).toBe(2)

  const blob = `${http.uploads[0].sha256}.png`
  await expect(page.locator(`[style*="${blob}"]`)).toHaveCount(2)
  await page.getByRole("button", { name: "Save" }).click()
  const ev = await expectPublished(relay, e => e.kind === EventKind.SetMetadata && e.pubkey === alice.pubkey)
  const profile = JSON.parse(ev.content)
  expect(profile.banner).toContain(blob)
  expect(profile.picture).toContain(blob)
})

test("keys page shows the public key and hides the private key", async ({ page }) => {
  await page.goto("/settings/keys")
  await expect(page.getByText("Public Key", { exact: true })).toBeVisible()
  await expect(page.getByText(alice.npub.slice(0, 16))).toBeVisible()
  await expect(page.getByText("Private Key", { exact: true })).toBeVisible()
  await expect(page.getByText(alice.nsec)).toHaveCount(0)
})

test("preferences save to app data", async ({ page, relay }) => {
  await page.goto("/settings/preferences")
  await after(page, "Theme", "select").selectOption("light")
  await page.getByRole("button", { name: "Save" }).first().click()
  const ev = await expectPublished(relay, e => e.kind === EventKind.AppData && e.pubkey === alice.pubkey)
  const data = JSON.parse(await alice.signer.nip44Decrypt(ev.content, alice.pubkey))
  expect(data.preferences.theme).toBe("light")
  await expect(page.locator("html")).toHaveClass(/light/)
})

test.describe("relays", () => {
  test("lists the relay list", async ({ page }) => {
    await page.goto("/settings/relays")
    await expect(page.getByRole("link", { name: "snort e2e relay" })).toBeVisible()
  })

  test("add and save", async ({ page, relay }) => {
    await page.goto("/settings/relays")
    await page.getByPlaceholder("wss://my-relay.com").fill("new-relay.snort.test")
    await page.getByRole("button", { name: "Add", exact: true }).first().click()
    await page.getByRole("button", { name: "Save" }).click()
    const ev = await expectPublished(relay, e => e.kind === EventKind.Relays && e.pubkey === alice.pubkey)
    expect(tagValues(ev, "r").sort()).toEqual([RelayUrl, "wss://new-relay.snort.test/"].sort())
  })

  test("remove", async ({ page, relay }) => {
    await page.goto("/settings/relays")
    await icon(page.getByRole("row", { name: /snort e2e relay/ }), "trash").click()
    const ev = await expectPublished(relay, e => e.kind === EventKind.Relays && e.pubkey === alice.pubkey)
    expect(tagValues(ev, "r")).toEqual([])
  })

  test("relay info page", async ({ page }) => {
    await page.goto("/settings/relays")
    await page.getByRole("link", { name: "snort e2e relay" }).click()
    await expect(page).toHaveURL(/\/settings\/relays\/.+/)
    await expect(page.getByText("Supported NIPs")).toBeVisible()
    await expect(page.getByRole("button", { name: "View Feed" })).toBeVisible()
  })
})

test.describe("media servers", () => {
  test("lists only server entries", async ({ page }) => {
    await page.goto("/settings/media")
    for (const s of BlossomServers) {
      await expect(page.getByText(s, { exact: true })).toBeVisible()
    }
    await expect(icon(page.locator("div.layer-1"), "trash")).toHaveCount(BlossomServers.length)
  })

  test("delete a server", async ({ page, relay }) => {
    await page.goto("/settings/media")
    const row = page.locator("div.layer-1").filter({ hasText: BlossomServers[0] })
    await icon(row, "trash").click()
    await expect(page.getByText(BlossomServers[0], { exact: true })).toHaveCount(0)
    const ev = await expectPublished(relay, e => e.kind === EventKind.BlossomServerList && e.pubkey === alice.pubkey)
    expect(tagValues(ev, "server")).toEqual([BlossomServers[1]])
    expect(ev.content).toBe("")
  })

  test("add a server", async ({ page, relay }) => {
    await page.goto("/settings/media")
    await page.getByPlaceholder("https://my-files.com/").fill("https://blossom-three.snort.test/")
    await page.getByRole("button", { name: "Add", exact: true }).first().click()
    await expect(page.getByText("https://blossom-three.snort.test/", { exact: true })).toBeVisible()
    const ev = await expectPublished(relay, e => e.kind === EventKind.BlossomServerList && e.pubkey === alice.pubkey)
    expect(tagValues(ev, "server")).toEqual([...BlossomServers, "https://blossom-three.snort.test/"])
  })
})

test("moderation muted words", async ({ page, relay }) => {
  await page.goto("/settings/moderation")
  await page.getByPlaceholder("eg. crypto").fill("spoilers")
  await page.getByRole("button", { name: "Add", exact: true }).click()
  const ev = await expectPublished(relay, e => e.kind === EventKind.MuteList && e.pubkey === alice.pubkey)
  expect(tagValues(ev, "word")).toContain("spoilers")
  await expect(page.getByText("spoilers")).toBeVisible()
})

test("accounts page", async ({ page }) => {
  await page.goto("/settings/accounts")
  await expect(page.getByRole("heading", { name: "Logins" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Switch" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Add Account" })).toBeVisible()
})

test("cache page", async ({ page }) => {
  await page.goto("/settings/cache")
  await expect(page.getByRole("heading", { name: "Cache" })).toBeVisible()
  for (const name of ["Profiles", "Relays", "Follow Lists", "Gift Wraps"]) {
    await expect(page.getByText(new RegExp(`^${name}\\s*\\d+ \\(\\d+ in memory\\)$`))).toBeVisible()
  }
})

test("notification settings", async ({ page }) => {
  await page.goto("/settings/notifications")
  await expect(page.getByText("Logged in with write access")).toBeVisible()
  await expect(page.getByRole("button", { name: "Allow" })).toBeVisible()
})

test("nostr address page lists handles without crashing", async ({ page }) => {
  await page.goto("/settings/handle")
  await expect(page.getByText("No handles found")).toBeVisible()
  await expect(page.getByRole("button", { name: "Buy Nostr Address" })).toBeVisible()
})

test.describe("wallet connections", () => {
  test("choose a wallet type", async ({ page }) => {
    await page.goto("/settings/wallet")
    await expect(page.getByRole("heading", { name: "Connect Wallet" })).toBeVisible()
    await page.getByText("Nostr Wallet Connect", { exact: true }).click()
    await expect(page).toHaveURL(/\/settings\/wallet\/nwc$/)
  })

  test("nwc form validates input", async ({ page }) => {
    await page.goto("/settings/wallet/nwc")
    const connect = page.getByRole("button", { name: "Connect" })
    await expect(connect).toBeDisabled()
    await page.getByPlaceholder("nostr+walletconnect:<pubkey>?relay=<relay>&secret=<secret>").fill("not a uri")
    await connect.click()
    await expect(page.locator("b.error")).not.toBeEmpty()
  })

  test("lndhub form validates input", async ({ page }) => {
    await page.goto("/settings/wallet/lndhub")
    const connect = page.getByRole("button", { name: "Connect" })
    await expect(connect).toBeDisabled()
    await page.getByPlaceholder("lndhub://username:password@lndhub.io").fill("lndhub://user:pass@lndhub.snort.test")
    await expect(connect).toBeEnabled()
  })
})

test.describe("tools", () => {
  test("links", async ({ page }) => {
    await page.goto("/settings/tools")
    await page.getByRole("link", { name: "Follows Relay Health" }).click()
    await expect(page.getByText("0/2 have relays")).toBeVisible()
    await page.goto("/settings/tools")
    await page.getByRole("link", { name: "Prune Follow List" }).click()
    await expect(page.getByRole("button", { name: "Compute prune list" })).toBeVisible()
    await page.goto("/settings/tools")
    await page.getByRole("link", { name: "Sync Account" }).click()
    await expect(page.getByRole("button", { name: "Start" })).toBeVisible()
  })
})

test("invite page", async ({ page }) => {
  await page.goto("/settings/invite")
  await expect(page.getByRole("heading", { name: "Invite your friends" })).toBeVisible()
})
