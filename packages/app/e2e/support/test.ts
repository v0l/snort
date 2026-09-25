import { test as base, expect, type Locator, type Page } from "@playwright/test"
import { EventKind, type NostrEvent } from "@snort/system"

import { addCoverage, collectCoverage } from "./coverage"
import { type HttpLog, mockHttp } from "./network"
import { FakeRelay } from "./relay"
import { type WalletLog, walletResponder } from "./wallet"
import { alice, buildWorld, freshDvm, NwcUri, trendingResult, type User, type World } from "./world"

interface Fixtures {
  relay: FakeRelay
  http: HttpLog
  wallet: WalletLog
  pageErrors: Array<string>
  login: (user?: User) => Promise<void>
}

export const test = base.extend<Fixtures, { world: World }>({
  world: [async ({}, use) => use(await buildWorld()), { scope: "worker" }],

  http: async ({ context, baseURL }, use) => {
    await use(await mockHttp(context, new URL(baseURL ?? "http://localhost").origin))
  },

  wallet: async ({}, use) => {
    await use({ balanceMsats: 21_000_000, payments: [], invoices: [] })
  },

  relay: async ({ world, context, http, wallet }, use) => {
    void http
    const relay = new FakeRelay(world.events)
    relay.onEvent(walletResponder(wallet))
    relay.onEvent(async ev => {
      if (ev.kind === 5300) {
        const n = world.notes
        if (ev.tags.some(t => t[0] === "p" && t[1] === freshDvm.pubkey)) {
          return [await trendingResult(ev, [n.carolLink.id], freshDvm)]
        }
        return [await trendingResult(ev, [n.bobHello.id, n.bobImage.id, n.daveHashtag.id, n.aliceFirst.id])]
      }
      return []
    })
    await context.routeWebSocket(/^wss?:\/\//, ws => relay.connect(ws))
    await use(relay)
  },

  pageErrors: async ({}, use) => {
    await use([])
  },

  page: async ({ page, relay, pageErrors }, use) => {
    void relay
    page.on("pageerror", e => pageErrors.push(e.message))
    if (collectCoverage) await page.coverage.startJSCoverage({ resetOnNavigation: false })
    await use(page)
    if (collectCoverage) await addCoverage(await page.coverage.stopJSCoverage())
    expect(pageErrors, "uncaught page errors").toEqual([])
  },

  login: async ({ page }, use) => {
    await use(async (user = alice) => {
      await page.goto("/login")
      await page.getByPlaceholder("nsec, npub, nip-05, hex, mnemonic").fill(user.nsec)
      await page.getByRole("button", { name: "Login" }).click()
      await expect(page.getByRole("button", { name: "New Note" })).toBeVisible()
    })
  },
})

export async function connectNwc(page: Page) {
  await page.goto("/settings/wallet/nwc")
  await page.getByPlaceholder("nostr+walletconnect:<pubkey>?relay=<relay>&secret=<secret>").fill(NwcUri)
  await page.getByRole("button", { name: "Connect" }).click()
  await expect(page).toHaveURL(/\/settings\/wallet$/)
}

export async function openNoteCreator(page: Page) {
  await page.getByRole("button", { name: "New Note" }).click()
  const editor = page.locator(".fixed textarea").first()
  await expect(editor).toBeVisible()
  return editor
}

export function icon(scope: Page | Locator, name: string) {
  return scope.locator(`svg:has(use[href$="#${name}"])`)
}

export function noteCard(page: Page, text: string) {
  return page.locator("div.relative.border-b").filter({ hasText: text }).first()
}

export async function expectPublished(relay: FakeRelay, match: (ev: NostrEvent) => boolean) {
  await expect.poll(() => relay.published.find(match), { timeout: 10_000 }).toBeTruthy()
  return relay.published.findLast(match) as NostrEvent
}

export function tagValues(ev: NostrEvent, key: string) {
  return ev.tags.filter(t => t[0] === key).map(t => t[1])
}

export { EventKind, expect }
