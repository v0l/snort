import { NostrLink } from "@snort/system"

import { expect, test } from "./support/test"
import { bob } from "./support/world"

test.use({ serviceWorkers: "allow" })

async function waitForWorker(page: import("@playwright/test").Page) {
  await page.goto("/")
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
}

const cacheNames = (page: import("@playwright/test").Page) => page.evaluate(() => caches.keys())

const cachedUrls = (page: import("@playwright/test").Page, name: string) =>
  page.evaluate(async n => (await (await caches.open(n)).keys()).map(r => r.url), name)

test("precache holds the shell and skips the agent bundle", async ({ page }) => {
  await waitForWorker(page)
  const precache = (await cacheNames(page)).find(n => n.startsWith("workbox-precache"))
  expect(precache).toBeDefined()
  const urls = await cachedUrls(page, precache as string)
  expect(urls.some(u => u.includes("/index.html"))).toBe(true)
  expect(urls.some(u => /stats\.html|\/agent-|\/AgentPage-|\/livekit-/.test(u))).toBe(false)
})

test("deep links load offline", async ({ page, context }) => {
  await waitForWorker(page)
  await context.setOffline(true)
  const rsp = await page.goto(`/p/${bob.npub}`)
  expect(rsp?.ok()).toBe(true)
  await expect(page.locator("#root")).not.toBeEmpty()
  await context.setOffline(false)
})

test("link previews are cached", async ({ page, world }) => {
  await waitForWorker(page)
  await page.goto(`/e/${NostrLink.fromEvent(world.notes.carolLink).encode()}`)
  await expect(page.getByText("Snort gets a test suite")).toBeVisible()
  await expect.poll(async () => (await cachedUrls(page, "preview-cache")).length).toBeGreaterThan(0)
})
