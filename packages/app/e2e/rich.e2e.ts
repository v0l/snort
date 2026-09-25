import { resolve } from "node:path"
import { NostrLink, parseNostrLink } from "@snort/system"

import { StoredBlob, TestInvoice } from "./support/network"
import {
  connectNwc,
  EventKind,
  expect,
  expectPublished,
  icon,
  noteCard,
  openNoteCreator,
  tagValues,
  test,
} from "./support/test"
import { alice, BlossomServers, bob, dave, GitViewerUrl } from "./support/world"

test.beforeEach(async ({ login }) => {
  await login()
})

test("poll shows its options", async ({ page, world }) => {
  await page.goto(`/e/${NostrLink.fromEvent(world.notes.bobPoll).encode()}`)
  await expect(page.getByText("Which relay do you use?")).toBeVisible()
  await expect(page.getByText("My own")).toBeVisible()
  await expect(page.getByText("A public one")).toBeVisible()
})

test("voting on a poll zaps the chosen option", async ({ page, world, http }) => {
  await page.goto(`/e/${NostrLink.fromEvent(world.notes.bobPoll).encode()}`)
  await expect(page.getByText("You are voting with 50 sats")).toBeVisible()
  await page.getByText("A public one").click()
  await expect(page.getByRole("link", { name: "Open Wallet" })).toHaveAttribute("href", `lightning:${TestInvoice}`)
  const zap = JSON.parse(http.zapCallbacks[0].searchParams.get("nostr") ?? "{}")
  expect(zap.kind).toBe(EventKind.ZapRequest)
  expect(zap.tags).toContainEqual(["poll_option", "1"])
  expect(tagValues(zap, "e")).toContain(world.notes.bobPoll.id)
  expect(http.zapCallbacks[0].searchParams.get("amount")).toBe("50000")
})

test("poll vote pays with a connected wallet", async ({ page, world, wallet }) => {
  await connectNwc(page)
  await page.goto(`/e/${NostrLink.fromEvent(world.notes.bobPoll).encode()}`)
  await page.getByText("My own").click()
  await expect.poll(() => wallet.payments).toEqual([TestInvoice])
  await expect(page.getByRole("link", { name: "Open Wallet" })).toHaveCount(0)
})

test("link preview", async ({ page, world }) => {
  await page.goto(`/e/${NostrLink.fromEvent(world.notes.carolLink).encode()}`)
  await expect(page.getByText("Snort gets a test suite")).toBeVisible()
  await expect(page.getByText("Every page, checked by Playwright")).toBeVisible()
})

test("cashu token card", async ({ page, world }) => {
  await page.goto(`/e/${NostrLink.fromEvent(world.notes.daveCashu).encode()}`)
  await expect(page.getByText("eSats")).toBeVisible()
  await expect(page.locator("span.text-3xl", { hasText: "10" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Redeem" })).toBeVisible()
})

test("clicking an image opens the spotlight", async ({ page }) => {
  await page.goto(`/p/${bob.npub}`)
  const image = noteCard(page, "Look at this cat").locator("img[src*='cat.png']").first()
  await image.click()
  const spotlight = page.locator(".fixed img[src*='cat.png']")
  await expect(spotlight).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(spotlight).toBeHidden()
})

test("zap without a wallet shows an invoice", async ({ page, http }) => {
  await page.goto("/following")
  await noteCard(page, "Hello from Bob").getByTitle("Zap").click()
  await expect(page.getByText(`Zap ${bob.displayName}`)).toBeVisible()
  await expect(page.getByText("Zap amount:")).toBeVisible()
  await page.getByRole("button", { name: /^Zap .* sats$/ }).click()
  await expect(page.getByRole("link", { name: "Open Wallet" })).toHaveAttribute("href", `lightning:${TestInvoice}`)
  const callback = http.zapCallbacks.at(-1)!
  const zapRequest = JSON.parse(callback.searchParams.get("nostr")!)
  expect(zapRequest.kind).toBe(EventKind.ZapRequest)
  expect(zapRequest.pubkey).toBe(alice.pubkey)
  expect(tagValues(zapRequest, "p")).toEqual([bob.pubkey])
  expect(callback.searchParams.get("amount")).toBe(tagValues(zapRequest, "amount")[0])
})

test("attach a file uploads to blossom and mirrors", async ({ page, relay, http }) => {
  const editor = await openNoteCreator(page)
  await editor.fill("Look at my upload")
  await icon(page.locator(".fixed"), "attachment").click()
  const chooser = page.waitForEvent("filechooser")
  await page.getByRole("menuitem", { name: "From File" }).click()
  await (await chooser).setFiles(resolve(import.meta.dirname, "../public/snort/nostrich_256.png"))
  await expect.poll(() => http.uploads.length).toBe(1)
  await expect.poll(() => http.mirrors.length).toBe(BlossomServers.length - 1)
  await expect(page.locator(".fixed img[src*='.png']").first()).toBeVisible()
  await page.getByRole("button", { name: "Send", exact: true }).click()
  const ev = await expectPublished(relay, e => e.kind === EventKind.TextNote && e.pubkey === alice.pubkey)
  const upload = http.uploads[0]
  expect(ev.content).toContain(`${upload.sha256}.png`)
  const imeta = ev.tags.find(t => t[0] === "imeta")!
  expect(imeta).toContain(`x ${upload.sha256}`)
  expect(imeta.some(v => v.startsWith("fallback "))).toBe(true)
})

test("attach a file from the media server list", async ({ page, relay }) => {
  const editor = await openNoteCreator(page)
  await editor.fill("From my server")
  await icon(page.locator(".fixed"), "attachment").click()
  await page.getByRole("menuitem", { name: "From Server" }).click()
  const select = page.getByRole("button", { name: "Select", exact: true })
  await expect(select).toBeDisabled()
  await expect(page.getByText("2KiB")).toBeAttached()
  await page.locator(`div[style*="${StoredBlob}"]`).click()
  await select.click()
  await expect(select).toHaveCount(0)
  await expect(page.locator(`.fixed img[src*="${StoredBlob}"]`)).toBeVisible()
  await page.getByRole("button", { name: "Send", exact: true }).click()
  const ev = await expectPublished(relay, e => e.kind === EventKind.TextNote && e.content.startsWith("From my server"))
  expect(ev.content).toContain(`${StoredBlob}.png`)
})

test("agent chat runs a tool and answers", async ({ page, http }) => {
  await page.goto("/agent")
  await page.getByPlaceholder("Ask me anything...").fill("who is bob?")
  await page.getByRole("button", { name: "Send" }).click()
  await expect(page.getByText("who is bob?")).toBeVisible()
  await expect(page.getByText("→ search_username")).toBeVisible()
  await expect(page.getByText("Results:")).toBeVisible()
  await expect(page.locator("strong", { hasText: "Bob Builder" })).toBeVisible()
  expect(http.aiRequests).toHaveLength(2)
})

test("unknown kinds offer app handlers", async ({ page, context, world }) => {
  const link = NostrLink.fromEvent(world.notes.carolRepo)
  await page.goto(`/e/${link.encode()}`)
  await expect(page.getByText(/Sorry, we dont understand this event kind \(Repository announcements\)/)).toBeVisible()
  await expect(page.getByText("Native App")).toBeVisible()
  const popup = context.waitForEvent("page")
  await page.getByRole("button", { name: "Git Viewer" }).click()
  const opened = (await popup).url()
  expect(opened.startsWith(GitViewerUrl)).toBe(true)
  const target = parseNostrLink(opened.slice(GitViewerUrl.length))
  expect([target.kind, target.author, target.id]).toEqual([link.kind, link.author, link.id])
})

test("follow set lists members and zaps them all", async ({ page, world, wallet, http }) => {
  await connectNwc(page)
  await page.goto(`/e/${NostrLink.fromEvent(world.notes.carolFollowSet).encode()}`)
  await expect(page.getByText("Strangers")).toBeVisible()
  await expect(page.getByText(dave.displayName).first()).toBeVisible()
  await page.getByRole("button", { name: "Zap all 50 sats" }).click()
  await expect.poll(() => wallet.payments).toEqual([TestInvoice])
  expect(http.zapCallbacks[0].pathname).toBe(`/lnurlp/${dave.name}/callback`)
  await expect(page.getByText(`Sent 50 sats to ${dave.displayName}`)).toBeVisible()
})

test("article thread shows only its own comments", async ({ page, relay, world }) => {
  await page.goto(`/e/${NostrLink.fromEvent(world.notes.carolArticle).encode()}`)
  await expect(page.getByText("Great write up")).toBeVisible()
  await expect(page.getByText("Comment on something else entirely")).toHaveCount(0)
  const commentFilters = relay.requests.filter(f => f.kinds?.includes(EventKind.Comment))
  expect(commentFilters.length).toBeGreaterThan(0)
  for (const f of commentFilters) {
    expect(Object.keys(f).some(k => k.startsWith("#"))).toBe(true)
  }
})
