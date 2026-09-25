import type { Page } from "@playwright/test"

import { EventBuilder } from "@snort/system"

import { EventKind, expect, noteCard, test } from "./support/test"
import { bob, dave } from "./support/world"

test.beforeEach(async ({ login }) => {
  await login()
})

async function openCacheDebug(page: Page) {
  await page.goto("/following")
  await expect(noteCard(page, "Hello from Bob")).toBeVisible()
  await page.goto("/cache-debug")
  await expect(page.getByRole("heading", { name: "Cache Query" })).toBeVisible()
}

async function queryUntil(page: Page, text: string | RegExp) {
  await expect(async () => {
    await page.getByRole("button", { name: "Query" }).click()
    await expect(page.getByRole("heading", { name: text })).toBeVisible({ timeout: 1_000 })
  }).toPass()
}

test("cache debug queries the local cache", async ({ page }) => {
  await openCacheDebug(page)
  await queryUntil(page, /Results: [1-9]/)
  await expect(noteCard(page, "Hello from Bob")).toBeVisible()
  await page.getByRole("button", { name: "Raw JSON" }).last().click()
  await expect(page.locator("pre", { hasText: '"content": "Hello from Bob' })).toBeVisible()
})

test("cache debug builder adds and removes fields", async ({ page }) => {
  await openCacheDebug(page)
  await page.getByRole("button", { name: "+ Add" }).click()
  await page.getByRole("combobox").selectOption("authors")
  const authors = page.getByPlaceholder("Enter pubkey, press ↵")
  await authors.fill(bob.pubkey)
  await authors.press("Enter")
  await page.getByText("Filter Preview").click()
  await expect(page.locator("pre", { hasText: bob.pubkey })).toBeVisible()
  await queryUntil(page, /Results: [1-9]/)
  await expect(page.locator("div.relative.border-b", { hasNotText: "Bob Builder" })).toHaveCount(0)
  await page.getByRole("button", { name: `${bob.pubkey.slice(0, 6)}…${bob.pubkey.slice(-4)} ✕` }).click()
  await expect(page.locator("pre", { hasText: bob.pubkey })).toHaveCount(0)
})

test("cache debug raw filter tolerates partial json", async ({ page }) => {
  await openCacheDebug(page)
  await page.getByRole("button", { name: "Raw JSON" }).first().click()
  const raw = page.getByPlaceholder('{"kinds": [1], "limit": 10}')
  await raw.fill('{"kinds": [1')
  await expect(page.getByRole("heading", { name: "Cache Query" })).toBeVisible()
  await page.getByRole("button", { name: "Query" }).click()
  await expect(page.getByText("Invalid JSON filter")).toBeVisible()
  await raw.fill('{"kinds": [1], "authors": ["' + bob.pubkey + '"]}')
  await queryUntil(page, /Results: [1-9]/)
})

test("cache debug inserts and deletes an event", async ({ page }) => {
  await openCacheDebug(page)
  const ev = await new EventBuilder().kind(EventKind.TextNote).content("Only in the cache").buildAndSign(dave.signer)
  await page.getByText("Manual Insert").click()
  await page.getByPlaceholder("paste a nostr event JSON").fill(JSON.stringify(ev))
  await page.getByRole("button", { name: "Insert" }).click()
  await page.getByRole("button", { name: "Raw JSON" }).first().click()
  await page.getByPlaceholder('{"kinds": [1], "limit": 10}').fill(JSON.stringify({ ids: [ev.id] }))
  await queryUntil(page, "Results: 1")
  await page.getByRole("button", { name: "Delete Matching" }).click()
  await expect(page.getByRole("heading", { name: "Results: 1" })).toBeVisible()
  await page.getByRole("button", { name: "Query" }).click()
  await expect(page.getByRole("heading", { name: "Results: 0" })).toBeVisible()
})
