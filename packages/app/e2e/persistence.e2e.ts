import { unixNow } from "@snort/shared"
import { EventBuilder } from "@snort/system"
import type { Page } from "@playwright/test"

import { FakeRelay } from "./support/relay"
import { EventKind, expect, expectPublished, icon, tagValues, test } from "./support/test"
import { alice, BlossomServers, bob, RelayUrl } from "./support/world"

const after = (page: Page, heading: string, selector: string) =>
  page.getByRole("heading", { name: heading, exact: true }).locator(`xpath=following::${selector}[1]`)

const relayLink = (page: Page, url: string) => page.locator(`a[href="/settings/relays/${encodeURIComponent(url)}"]`)

async function expectPreferences(page: Page) {
  await page.goto("/settings/preferences")
  await expect(after(page, "Default Page", "select")).toHaveValue("global")
  await expect(after(page, "Theme", "select")).toHaveValue("dark")
  await expect(page.locator("html")).not.toHaveClass(/light/)
}

async function openChat(page: Page, name: string) {
  await page.goto("/messages")
  await page.getByText(name).first().click()
  await expect(page).toHaveURL(/\/messages\/.+/)
}

test.describe("app data", () => {
  test("preferences load on reload and clean login", async ({ page, relay, login, cleanLogin }) => {
    await login()
    await page.goto("/settings/preferences")
    await after(page, "Default Page", "select").selectOption("global")
    await after(page, "Theme", "select").selectOption("dark")
    await page.getByRole("button", { name: "Save" }).first().click()
    const ev = await expectPublished(relay, e => e.kind === EventKind.AppData && e.pubkey === alice.pubkey)
    const data = JSON.parse(await alice.signer.nip44Decrypt(ev.content, alice.pubkey))
    expect(data.preferences).toMatchObject({ defaultRootTab: "global", theme: "dark" })

    await page.reload()
    await expectPreferences(page)
    await expectPreferences(await cleanLogin())
  })

  test("existing app data loads on a clean login", async ({ page, relay, login }) => {
    const content = JSON.stringify({ preferences: { defaultRootTab: "global", theme: "dark" } })
    relay.add(
      await new EventBuilder()
        .kind(EventKind.AppData)
        .content(await alice.signer.nip44Encrypt(content, alice.pubkey))
        .tag(["d", "snort"])
        .createdAt(unixNow() - 60)
        .buildAndSign(alice.signer),
    )
    await login()
    await expectPreferences(page)
  })
})

test.describe("removed settings", () => {
  const imgproxy = { url: "https://imgproxy.snort.test", key: "aa", salt: "bb" }

  async function decryptLatest(relay: import("./support/relay").FakeRelay) {
    const ev = relay.latest({ kinds: [EventKind.AppData], authors: [alice.pubkey], "#d": ["snort"] })
    return ev ? JSON.parse(await alice.signer.nip44Decrypt(ev.content, alice.pubkey)) : undefined
  }

  test("turning imgproxy off stays off after a reload and a clean login", async ({
    page,
    relay,
    login,
    cleanLogin,
  }) => {
    const content = JSON.stringify({ preferences: { imgProxyConfig: imgproxy } })
    relay.add(
      await new EventBuilder()
        .kind(EventKind.AppData)
        .content(await alice.signer.nip44Encrypt(content, alice.pubkey))
        .tag(["d", "snort"])
        .createdAt(unixNow() - 600)
        .buildAndSign(alice.signer),
    )
    await login()
    await page.goto("/settings/preferences")
    const toggle = page
      .getByText("Use imgproxy to compress images")
      .locator("xpath=following::input[@type='checkbox'][1]")
    await expect(toggle).toBeChecked()

    await toggle.uncheck()
    await page.getByRole("button", { name: "Save" }).first().click()
    await expect
      .poll(async () => (await decryptLatest(relay))?.preferences?.imgProxyConfig ?? "removed")
      .toBe("removed")

    await page.reload()
    await page.goto("/settings/preferences")
    await expect(toggle).not.toBeChecked()

    const fresh = await cleanLogin()
    await fresh.goto("/settings/preferences")
    await expect(
      fresh.getByText("Use imgproxy to compress images").locator("xpath=following::input[@type='checkbox'][1]"),
    ).not.toBeChecked()
  })
})

test.describe("app data across relays", () => {
  const SlowRelay = "wss://slow.snort.test/"
  const theme = (page: Page) => after(page, "Theme", "select")

  async function appData(prefs: object, age: number) {
    return await new EventBuilder()
      .kind(EventKind.AppData)
      .content(await alice.signer.nip44Encrypt(JSON.stringify({ preferences: prefs }), alice.pubkey))
      .tag(["d", "snort"])
      .createdAt(unixNow() - age)
      .buildAndSign(alice.signer)
  }

  test("the newest settings load even when a faster relay has an older copy", async ({
    page,
    relay,
    extraRelays,
    login,
  }) => {
    const slow = new FakeRelay([await appData({ theme: "dark", imgProxyConfig: undefined }, 60)])
    slow.replyDelay = 1500
    extraRelays.set(SlowRelay, slow)
    relay.add(await appData({ theme: "light" }, 3600))
    relay.add(
      await new EventBuilder()
        .kind(EventKind.Relays)
        .tag(["r", RelayUrl])
        .tag(["r", SlowRelay])
        .createdAt(unixNow() - 30)
        .buildAndSign(alice.signer),
    )

    await login()
    await page.goto("/settings/preferences")
    await expect(theme(page)).toHaveValue("dark")
    await expect(page.locator("html")).not.toHaveClass(/light/)

    await theme(page).selectOption("system")
    await page.getByRole("button", { name: "Save" }).first().click()
    for (const r of [relay, slow]) {
      await expect
        .poll(async () => {
          const ev = r.latest({ kinds: [EventKind.AppData], authors: [alice.pubkey], "#d": ["snort"] })
          return ev
            ? JSON.parse(await alice.signer.nip44Decrypt(ev.content, alice.pubkey)).preferences.theme
            : undefined
        })
        .toBe("system")
    }
  })
})

test.describe("direct messages", () => {
  test("sent messages load on reload and clean login for both sides", async ({
    page,
    relay,
    world,
    login,
    cleanLogin,
  }) => {
    const text = "Persisted message to Bob"
    await login()
    await openChat(page, bob.displayName)
    const input = page.locator("textarea.rta__textarea:visible")
    await input.fill(text)
    await input.press("Enter")
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

    await page.reload()
    await expect(page.locator("div[dir=auto]", { hasText: text })).toBeVisible()
    await expect(page.locator("div[dir=auto]", { hasText: world.dmText })).toBeVisible()

    const aliceAgain = await cleanLogin(alice)
    await openChat(aliceAgain, bob.displayName)
    await expect(aliceAgain.locator("div[dir=auto]", { hasText: world.dmText })).toBeVisible()
    await expect(aliceAgain.locator("div[dir=auto]", { hasText: text })).toBeVisible()

    const bobPage = await cleanLogin(bob)
    await openChat(bobPage, alice.displayName)
    await expect(bobPage.locator("div[dir=auto]", { hasText: text })).toBeVisible()
  })
})

test.describe("relays", () => {
  const added = "wss://new-relay.snort.test/"

  test("added relay loads on reload and clean login", async ({ page, relay, login, cleanLogin }) => {
    await login()
    await page.goto("/settings/relays")
    await page.getByPlaceholder("wss://my-relay.com").fill("new-relay.snort.test")
    await page.getByRole("button", { name: "Add", exact: true }).first().click()
    await page.getByRole("button", { name: "Save" }).click()
    const ev = await expectPublished(relay, e => e.kind === EventKind.Relays && e.pubkey === alice.pubkey)
    expect(tagValues(ev, "r").sort()).toEqual([RelayUrl, added].sort())

    const check = async (p: Page) => {
      await p.goto("/settings/relays")
      await expect(relayLink(p, RelayUrl)).toBeVisible()
      await expect(relayLink(p, added)).toBeVisible()
    }
    await page.reload()
    await check(page)
    await check(await cleanLogin())
  })
})

test.describe("media servers", () => {
  const added = "https://blossom-three.snort.test/"

  test("added server loads on reload and clean login", async ({ page, relay, login, cleanLogin }) => {
    await login()
    await page.goto("/settings/media")
    await page.getByPlaceholder("https://my-files.com/").fill(added)
    await page.getByRole("button", { name: "Add", exact: true }).first().click()
    await expectPublished(
      relay,
      e =>
        e.kind === EventKind.BlossomServerList && e.pubkey === alice.pubkey && tagValues(e, "server").includes(added),
    )

    const check = async (p: Page) => {
      await p.goto("/settings/media")
      for (const s of [...BlossomServers, added]) {
        await expect(p.getByText(s, { exact: true })).toBeVisible()
      }
    }
    await page.reload()
    await check(page)
    await check(await cleanLogin())
  })

  test("deleted server stays deleted on reload and clean login", async ({ page, relay, login, cleanLogin }) => {
    await login()
    await page.goto("/settings/media")
    await icon(page.locator("div.layer-1").filter({ hasText: BlossomServers[0] }), "trash").click()
    await expectPublished(
      relay,
      e => e.kind === EventKind.BlossomServerList && e.pubkey === alice.pubkey && tagValues(e, "server").length === 1,
    )

    const check = async (p: Page) => {
      await p.goto("/settings/media")
      await expect(p.getByText(BlossomServers[1], { exact: true })).toBeVisible()
      await expect(p.getByText(BlossomServers[0], { exact: true })).toHaveCount(0)
    }
    await page.reload()
    await check(page)
    await check(await cleanLogin())
  })
})
