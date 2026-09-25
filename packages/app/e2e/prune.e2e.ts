import { sha256, unixNow } from "@snort/shared"
import { EventBuilder } from "@snort/system"

import { EventKind, expect, expectPublished, tagValues, test } from "./support/test"
import { alice, bob, carol } from "./support/world"

const ghost = sha256("snort-e2e-ghost")

test("prune follows removes inactive accounts", async ({ page, relay, login }) => {
  const follows = new EventBuilder()
    .kind(EventKind.ContactList)
    .createdAt(unixNow() - 60)
    .tag(["p", bob.pubkey])
    .tag(["p", carol.pubkey])
    .tag(["p", ghost])
  relay.add(await follows.buildAndSign(alice.signer))
  await login()

  await page.goto("/settings/tools/prune-follows")
  await expect(page.getByText("3 follows (0 duplicates)")).toBeVisible()
  await page.getByRole("button", { name: "Compute prune list" }).click()
  const row = page.locator("div.flex.justify-between", { hasText: "Last post 1/1/1970" })
  await expect(row).toHaveCount(1)
  await expect(page.getByText(/^Last post/)).toHaveCount(1)
  await row.getByRole("checkbox").check()
  await expect(page.getByText("New follow list length 2")).toBeVisible()
  await page.getByRole("button", { name: "Save" }).click()
  const ev = await expectPublished(relay, e => e.kind === EventKind.ContactList && e.pubkey === alice.pubkey)
  expect(tagValues(ev, "p").sort()).toEqual([bob.pubkey, carol.pubkey].sort())
})
