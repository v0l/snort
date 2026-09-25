import { TestInvoice } from "./support/network"
import { connectNwc, expect, noteCard, test } from "./support/test"

test.beforeEach(async ({ login }) => {
  await login()
})

test("connect a nostr wallet connect wallet", async ({ page }) => {
  await connectNwc(page)
  await page.goto("/wallet")
  await expect(page.getByText("21,000").first()).toBeVisible()
  await expect(page.getByText("coffee money")).toBeVisible()
  await expect(page.getByRole("button", { name: "Receive" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Send" })).toBeVisible()
})

test("receive creates an invoice", async ({ page, wallet }) => {
  await connectNwc(page)
  await page.goto("/wallet/receive")
  await page.getByRole("spinbutton").fill("1000")
  await page.getByPlaceholder("Comment").fill("for tests")
  await page.getByRole("button", { name: "Generate Invoice" }).click()
  await expect.poll(() => wallet.invoices).toEqual([{ amount: 1_000_000, description: "for tests" }])
  await expect(page.getByText(`${TestInvoice.slice(0, 16)}...${TestInvoice.slice(-16)}`)).toBeVisible()
})

test("send pays an invoice", async ({ page, wallet }) => {
  await connectNwc(page)
  await page.goto("/wallet/send")
  await page.getByPlaceholder("Invoice / Lightning Address").fill(TestInvoice)
  await page.getByRole("button", { name: "Pay" }).click()
  await expect.poll(() => wallet.payments).toEqual([TestInvoice])
})

test("zap pays through the connected wallet", async ({ page, wallet }) => {
  await connectNwc(page)
  await page.goto("/following")
  await noteCard(page, "Hello from Bob").getByTitle("Zap").click()
  await expect.poll(() => wallet.payments).toEqual([TestInvoice])
  await expect(page.getByText("Zap amount:")).toHaveCount(0)
})

test("sidebar balance reflects the wallet", async ({ page }) => {
  await connectNwc(page)
  await page.goto("/following")
  await expect(page.getByText("21,000").first()).toBeVisible()
})
