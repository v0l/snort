import { PinEncrypted } from "@snort/system"

import { EventKind, expect, expectPublished, test } from "./support/test"
import { alice } from "./support/world"

const keyInput = "nsec, npub, nip-05, hex, mnemonic"

test.describe("sign in", () => {
  test("with nsec", async ({ page, login }) => {
    await login()
    for (const link of ["Home", "Discover", "Notifications", "Messages", "Settings"]) {
      await expect(page.getByRole("link", { name: link, exact: true })).toBeVisible()
    }
    await expect(page.getByRole("button", { name: "Sign up" })).toHaveCount(0)
    await expect(page.getByText(alice.displayName).first()).toBeVisible()
  })

  test("with hex private key", async ({ page }) => {
    await page.goto("/login")
    await page.getByPlaceholder(keyInput).fill(alice.privateKey)
    await page.getByRole("button", { name: "Login" }).click()
    await expect(page.getByRole("button", { name: "New Note" })).toBeVisible()
  })

  test("with npub is read only", async ({ page }) => {
    await page.goto("/login")
    await page.getByPlaceholder(keyInput).fill(alice.npub)
    await expect(page.getByRole("link", { name: "Settings" })).toBeVisible()
    await page.goto("/following")
    await expect(page.getByText("Hello from Bob").first()).toBeVisible()
    await page.goto("/settings/keys")
    await expect(page.getByText("Private Key")).toHaveCount(0)
  })

  test("with a nip-06 mnemonic", async ({ page }) => {
    const mnemonic =
      "what bleak badge arrange retreat wolf trade produce cricket blur garlic valid proud rude strong choose busy staff weather area salt hollow arm fade"
    const pubkey = "d41b22899549e1f3d335a31002cfd382174006e166d3e658e3a5eecdb6463573"
    await page.goto("/login")
    await page.getByPlaceholder(keyInput).fill(mnemonic)
    await page.getByRole("button", { name: "Login" }).click()
    await expect(page.getByRole("button", { name: "New Note" })).toBeVisible()
    await expect.poll(() => page.evaluate(() => localStorage.getItem("sessions") ?? "")).toContain(pubkey)
  })

  test("with a nostr address is read only", async ({ page }) => {
    await page.goto("/login")
    await page.getByPlaceholder(keyInput).fill(`${alice.name}@snort.test`)
    await page.getByRole("button", { name: "Login" }).click()
    await expect(page.getByRole("link", { name: "Settings" })).toBeVisible()
    await expect(page.getByRole("button", { name: "New Note" })).toHaveCount(0)
    await expect.poll(() => page.evaluate(() => localStorage.getItem("sessions") ?? "")).toContain(alice.pubkey)
  })

  test("invalid key shows an error", async ({ page }) => {
    await page.goto("/login")
    await page.getByPlaceholder(keyInput).fill("not a key")
    await page.getByRole("button", { name: "Login" }).click()
    await expect(page.locator("b.text-error")).not.toBeEmpty()
    await expect(page).toHaveURL(/\/login$/)
  })

  test("session survives a reload", async ({ page, login }) => {
    await login()
    await page.reload()
    await expect(page.getByRole("button", { name: "New Note" })).toBeVisible()
  })

  test("log out", async ({ page, login }) => {
    await login()
    await page.goto("/settings/accounts")
    await expect(page.getByRole("heading", { name: "Logins" })).toBeVisible()
    await page.getByRole("button", { name: "Logout" }).click()
    await expect(page.getByRole("button", { name: "Sign up" })).toBeVisible()
    await page.reload()
    await expect(page.getByRole("button", { name: "Sign up" })).toBeVisible()
  })

  test("links between sign in and sign up", async ({ page }) => {
    await page.goto("/login")
    await page.getByRole("button", { name: "Sign Up", exact: true }).click()
    await expect(page.getByRole("heading", { name: "Sign Up" })).toBeVisible()
    await page.getByRole("button", { name: "Sign In" }).click()
    await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible()
  })

  test("language picker translates the page", async ({ page }) => {
    await page.goto("/login")
    await page.getByRole("combobox").selectOption("de")
    await expect(page.getByRole("heading", { name: "Anmelden" })).toBeVisible()
  })
})

test("sign up creates a profile", async ({ page, relay }) => {
  await page.goto("/login/sign-up")
  const next = page.getByRole("button", { name: "Next" })
  await expect(next).toBeDisabled()
  await page.getByPlaceholder("Name or nym").fill("Eve Newcomer")
  await next.click()
  await expect(page).toHaveURL(/\/login\/sign-up\/profile$/)
  await expect(page.getByText("Profile Image")).toBeVisible()
  await page.getByRole("button", { name: "Next" }).click()
  await expect(page).toHaveURL(/\/login\/sign-up\/topics$/)
  await expect(page.getByText("Pick a few topics of interest")).toBeVisible()
  await page.getByText("Technology").click()
  await page.getByRole("button", { name: "Next" }).click()
  await expect(page).toHaveURL(/\/login\/sign-up\/discover$/)
  await page.getByRole("button", { name: "Next" }).click()
  await expect(page).toHaveURL(/\/login\/sign-up\/moderation$/)
  await expect(page.getByText("Clean up your feed")).toBeVisible()
  await page.getByRole("button", { name: "Finish" }).click()
  await expect(page.getByRole("button", { name: "New Note" })).toBeVisible()
  const profile = await expectPublished(relay, ev => ev.kind === EventKind.SetMetadata)
  expect(JSON.parse(profile.content).name).toBe("Eve Newcomer")
})

test.describe("pin locked session", () => {
  const pin = "4821"
  let locked: object

  test.beforeAll(async () => {
    locked = (await PinEncrypted.create(alice.privateKey, pin)).toPayload()
  })

  test.beforeEach(async ({ page, login }) => {
    test.slow()
    await login()
    await expect.poll(() => page.evaluate(() => localStorage.getItem("sessions") ?? "")).toContain(alice.pubkey)
    await page.addInitScript(payload => {
      if (sessionStorage.getItem("pin-seeded")) return
      sessionStorage.setItem("pin-seeded", "1")
      const sessions = JSON.parse(localStorage.getItem("sessions") ?? "[]")
      for (const s of sessions) s.privateKeyData = payload
      localStorage.setItem("sessions", JSON.stringify(sessions))
    }, locked)
    await page.goto("/following")
    await expect(page.getByText("Enter pin to unlock your private key")).toBeVisible()
  })

  test("rejects a short or wrong pin, then unlocks", async ({ page, relay }) => {
    const input = page.locator(".fixed input[type=number]")
    await input.fill("12")
    await page.getByRole("button", { name: "Submit" }).click()
    await expect(page.getByText("Pin too short")).toBeVisible()
    await input.fill("0000")
    await page.getByRole("button", { name: "Submit" }).click()
    await expect(page.getByText("Incorrect pin")).toBeVisible({ timeout: 60_000 })
    await input.fill(pin)
    await page.getByRole("button", { name: "Submit" }).click()
    await expect(page.getByText("Enter pin to unlock your private key")).toHaveCount(0, { timeout: 60_000 })
    await page.getByRole("button", { name: "New Note" }).click()
    await page.locator(".fixed textarea").first().fill("Unlocked with a pin")
    await page.getByRole("button", { name: "Send", exact: true }).click()
    const ev = await expectPublished(relay, e => e.content === "Unlocked with a pin")
    expect(ev.pubkey).toBe(alice.pubkey)
  })

  test("cancel leaves the session read only", async ({ page }) => {
    await page.getByRole("button", { name: "Cancel" }).click()
    await expect(page.getByText("Enter pin to unlock your private key")).toHaveCount(0)
    await expect(page.getByText(alice.displayName).first()).toBeVisible()
    await expect(page.getByRole("button", { name: "New Note" })).toHaveCount(0)
  })
})
