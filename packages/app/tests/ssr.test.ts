import { beforeAll, describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import vm from "node:vm"

const appDir = join(import.meta.dir, "..")
const pubkey = "84dee6e676e5bb67b4ad4e042cf70cbd8681155db535942fcc6a0533858a7240"
const noteId = "a".repeat(64)

const profile = {
  id: "b".repeat(64),
  pubkey,
  created_at: 1_700_000_000,
  kind: 0,
  tags: [],
  content: JSON.stringify({ name: "Edward Snowden", about: "I used to work for the government." }),
  sig: "c".repeat(128),
}
const note = {
  id: noteId,
  pubkey,
  created_at: 1_762_129_000,
  kind: 1,
  tags: [],
  content: "a note rendered on the server",
  sig: "d".repeat(128),
}

interface Filter {
  ids?: Array<string>
  authors?: Array<string>
  kinds?: Array<number>
}

function relayQuery(filtersJson: string) {
  const filters = JSON.parse(filtersJson) as Array<Filter>
  const matches = (ev: typeof note, f: Filter) =>
    (!f.ids || f.ids.includes(ev.id)) &&
    (!f.authors || f.authors.includes(ev.pubkey)) &&
    (!f.kinds || f.kinds.includes(ev.kind))
  return JSON.stringify([profile, note].filter(ev => filters.some(f => matches(ev, f))))
}

let context: vm.Context

async function render(url: string) {
  const input = JSON.stringify({ url, now: 1_762_130_000, origin: "https://snort.social" })
  const out = await vm.runInContext(`ssrRender(${JSON.stringify(input)})`, context)
  return JSON.parse(out) as { html: string; status: number; data: { queries: Record<string, Array<unknown>> } }
}

describe("ssr bundle", () => {
  beforeAll(() => {
    const build = Bun.spawnSync(["bunx", "vite", "build", "-c", "vite.ssr.config.ts", "--logLevel", "error"], {
      cwd: appDir,
    })
    expect(build.exitCode).toBe(0)
    context = vm.createContext({ relayQuery, hostLog: () => {} })
    vm.runInContext(readFileSync(join(appDir, "build/ssr/render.js"), "utf8"), context)
  }, 120_000)

  test("renders a profile with its name and notes", async () => {
    const out = await render(`/p/${pubkey}`)
    expect(out.status).toBe(200)
    expect(out.html).toContain("Edward Snowden")
    expect(out.html).toContain("a note rendered on the server")
  })

  test("embeds the query results the page used", async () => {
    const out = await render(`/p/${pubkey}`)
    const events = Object.values(out.data.queries).flat()
    expect(events.length).toBeGreaterThan(0)
  })

  test("an unknown path is a 404", async () => {
    const out = await render("/nope/not-a-page")
    expect(out.status).toBe(404)
  })

  test("a malformed thread id is a 404, not a render error", async () => {
    const out = await render("/e/note1notavalidbech32")
    expect(out.status).toBe(404)
  })

  test("a bad messages or list feed id is a 404", async () => {
    expect((await render("/messages/abc")).status).toBe(404)
    expect((await render("/list-feed/abc")).status).toBe(404)
  })

  test("a query string does not break the render", async () => {
    const out = await render(`/p/${pubkey}?tab=notes`)
    expect(out.status).toBe(200)
  })

  test("the accounts page renders no visitor sessions, so the client can hydrate it", async () => {
    const sessions = JSON.stringify([
      { id: "a", type: "public_key", publicKey: pubkey, readonly: true },
      { id: "b", type: "public_key", publicKey: "e".repeat(64), readonly: true },
    ])
    const storage = { getItem: (k: string) => (k === "sessions" ? sessions : null), setItem() {}, removeItem() {} }
    const withSessions = vm.createContext({ relayQuery, hostLog: () => {}, localStorage: storage })
    vm.runInContext(readFileSync(join(appDir, "build/ssr/render.js"), "utf8"), withSessions)
    const input = JSON.stringify({ url: "/settings/accounts", now: 1_762_130_000, origin: "https://snort.social" })
    const out = JSON.parse(await vm.runInContext(`ssrRender(${JSON.stringify(input)})`, withSessions))
    expect(out.html).toContain("Logins")
    expect(out.html).not.toContain("Switch")
  })
})
