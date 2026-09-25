import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import type { BrowserContext, Route } from "@playwright/test"
import type { NostrEvent } from "@snort/system"

import { alice, BlossomServers, bob, carol, dave, dvm, Hashtag, LinkPreviewUrl } from "./world"

const png = readFileSync(resolve(import.meta.dirname, "../../public/snort/nostrich_256.png"))

export const StoredBlob = "b1".repeat(32)
export const TestInvoice =
  "lnbc2500u1pvjluezsp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygspp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdq5xysxxatsyp3k7enxv4jsxqzpu9qrsgquk0rl77nj30yxdy8j9vdx85fkpmdla2087ne0xh8nhedh8w27kyke0lp53ut353s06fv3qfegext0eh0ymjpf39tuven09sam30g4vgpfna3rh"

const relayInfo = {
  name: "snort e2e relay",
  description: "In-memory relay used by the Playwright suite",
  pubkey: alice.pubkey,
  software: "snort-e2e",
  version: "1",
  supported_nips: [1, 2, 9, 11, 12, 15, 16, 20, 22, 33, 40, 45, 50],
}

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*, Authorization, X-SHA-256, X-Content-Length, X-Content-Type",
  "access-control-allow-methods": "GET, POST, PUT, HEAD, DELETE, OPTIONS",
  "access-control-expose-headers": "*",
}

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: "application/json", headers: cors, body: JSON.stringify(body) })

const sse = (route: Route, chunks: Array<object>) =>
  route.fulfill({
    status: 200,
    contentType: "text/event-stream",
    headers: cors,
    body: `${chunks.map(c => `data: ${JSON.stringify(c)}\n\n`).join("")}data: [DONE]\n\n`,
  })

export interface HttpLog {
  uploads: Array<{ server: string; sha256: string; size: number }>
  mirrors: Array<{ server: string; url: string }>
  zapCallbacks: Array<URL>
  aiRequests: Array<{ model: string; messages: Array<{ role: string; content: unknown }> }>
  aiScript: Array<AiStep>
  reports: Array<{ server: string; event: NostrEvent }>
  handles?: Array<{ id: string; handle: string; domain: string; pubkey: string; created: string; lnAddress?: string }>
  handleCalls: Array<{ method: string; path: string; query: string; body?: unknown; auth?: NostrEvent }>
}

export const RemoteProfile = {
  pubkey: "f4".repeat(32),
  name: "frank",
  display_name: "Frank Remote",
  picture: "https://img.snort.test/frank.png",
  scores: {},
  bio: "",
  confidence: 0,
}

export const TakenHandle = "taken"
export const HandlePassword = "correct-horse-battery"

const aiChunk = { id: "x", object: "chat.completion.chunk", created: 0, model: "snort-test" }

export type AiStep = { tool: string; args: object; reasoning?: string } | { text: string }

export const DefaultAiScript: Array<AiStep> = [
  { tool: "search_username", args: { query: "bob" }, reasoning: "Looking up bob" },
  { text: "I found **Bob Builder**." },
]

function aiReply(route: Route, step: AiStep) {
  if ("text" in step) {
    return sse(route, [
      { ...aiChunk, choices: [{ index: 0, delta: { role: "assistant", content: step.text } }] },
      { ...aiChunk, choices: [{ index: 0, delta: {}, finish_reason: "stop" }] },
    ])
  }
  const call = { index: 0, id: `call_${step.tool}`, type: "function" }
  return sse(route, [
    ...(step.reasoning
      ? [{ ...aiChunk, choices: [{ index: 0, delta: { role: "assistant", reasoning_content: step.reasoning } }] }]
      : []),
    {
      ...aiChunk,
      choices: [
        {
          index: 0,
          delta: { tool_calls: [{ ...call, function: { name: step.tool, arguments: JSON.stringify(step.args) } }] },
        },
      ],
    },
    { ...aiChunk, choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }] },
  ])
}

function nostrAddressService(route: Route, url: URL, log: HttpLog) {
  const path = url.pathname.slice("/api/v1/n5sp".length)
  const req = route.request()
  const authHeader = req.headers().authorization ?? ""
  const auth = authHeader.startsWith("Nostr ")
    ? (JSON.parse(Buffer.from(authHeader.slice(6), "base64").toString()) as NostrEvent)
    : undefined
  const body = req.postData() ? req.postDataJSON() : undefined
  log.handleCalls.push({ method: req.method(), path, query: url.search, body, auth })

  const quote = { price: 5_000, data: { type: "premium" } }
  if (path === "/config.json") {
    return json(route, {
      domains: [
        { name: "snort.social", default: true, length: [2, 20], regex: ["^[a-z0-9_]+$", ""], regexChars: ["", ""] },
        { name: "nostr.test", default: false, length: [2, 20], regex: ["^[a-z0-9_]+$", ""], regexChars: ["", ""] },
      ],
    })
  }
  if (path === "/registration/availability") {
    return json(route, body.name === TakenHandle ? { available: false, why: "REGISTERED" } : { available: true, quote })
  }
  if (path === "/registration/register") {
    return json(route, { quote, paymentHash: "33".repeat(32), invoice: TestInvoice, token: "register-token" })
  }
  if (path === "/registration/register/check") {
    return json(route, { available: true, paid: true, password: HandlePassword })
  }
  if (path === "/list" && log.handles) {
    return json(route, log.handles)
  }
  if (req.method() === "PATCH" && log.handles?.some(h => path.startsWith(`/${h.id}`))) {
    return json(route, {})
  }
  return json(route, { error: "UNKNOWN_ERROR", errors: ["not found"] }, 404)
}

export async function mockHttp(context: BrowserContext, origin: string): Promise<HttpLog> {
  const log: HttpLog = {
    uploads: [],
    mirrors: [],
    zapCallbacks: [],
    aiRequests: [],
    aiScript: DefaultAiScript,
    handleCalls: [],
    reports: [],
  }
  const blobs = new Map<string, { type: string; size: number }>([[StoredBlob, { type: "image/png", size: 2_048 }]])

  const descriptor = (server: string, sha256: string) => {
    const blob = blobs.get(sha256)
    return {
      url: `${server}${sha256}.png`,
      sha256,
      size: blob?.size ?? 0,
      type: blob?.type ?? "image/png",
      uploaded: Math.floor(Date.now() / 1000),
    }
  }

  await context.route("**/*", async route => {
    const req = route.request()
    const url = new URL(req.url())
    if (url.origin === origin) return route.continue()
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors })

    if ((req.headers().accept ?? "").includes("application/nostr+json")) {
      return json(route, relayInfo)
    }
    if (url.pathname === "/.well-known/nostr.json") {
      const names = Object.fromEntries([alice, bob, carol, dave].map(u => [u.name, u.pubkey]))
      return json(route, { names })
    }
    if (url.pathname.startsWith("/.well-known/lnurlp/")) {
      const name = url.pathname.split("/").pop()
      return json(route, {
        tag: "payRequest",
        callback: `${url.origin}/lnurlp/${name}/callback`,
        minSendable: 1_000,
        maxSendable: 100_000_000_000,
        metadata: JSON.stringify([["text/plain", `Pay ${name}`]]),
        allowsNostr: true,
        nostrPubkey: dvm.pubkey,
        commentAllowed: 255,
      })
    }
    if (url.pathname.startsWith("/lnurlp/") && url.pathname.endsWith("/callback")) {
      log.zapCallbacks.push(url)
      return json(route, { pr: TestInvoice, routes: [] })
    }
    if (url.hostname === "api.snort.social" && url.pathname.startsWith("/api/v1/n5sp")) {
      return nostrAddressService(route, url, log)
    }
    if (url.hostname === "profiles.v0l.io" && url.pathname === "/api/search") {
      const q = (url.searchParams.get("q") ?? "").toLowerCase()
      return json(route, RemoteProfile.name.startsWith(q) ? [RemoteProfile] : [])
    }
    if (url.hostname === "api.nostr.band") {
      if (url.pathname.startsWith("/v0/trending/hashtags")) {
        return json(route, { hashtags: [{ hashtag: Hashtag, posts: 42 }] })
      }
      if (url.pathname.startsWith("/v0/trending/profiles")) {
        return json(route, { profiles: [bob, carol, dave].map(u => ({ pubkey: u.pubkey, new_follower_count: 1 })) })
      }
    }
    if (url.hostname === "nostr-rs-api.v0l.io" && url.pathname === "/preview") {
      if (url.searchParams.get("url") === LinkPreviewUrl) {
        return json(route, {
          title: "Snort gets a test suite",
          description: "Every page, checked by Playwright",
          image: "https://img.snort.test/preview.png",
        })
      }
      return json(route, {}, 404)
    }
    if (url.hostname === "yalr.v0l.io") {
      if (url.pathname.endsWith("/models")) {
        return json(route, {
          object: "list",
          data: [
            { id: "snort-test", object: "model" },
            { id: "snort-test-large", object: "model" },
          ],
        })
      }
      if (url.pathname.endsWith("/chat/completions")) {
        const body = req.postDataJSON() as HttpLog["aiRequests"][number]
        log.aiRequests.push(body)
        const turn = body.messages.filter(m => m.role === "tool").length
        return aiReply(route, log.aiScript[Math.min(turn, log.aiScript.length - 1)])
      }
    }
    const blossom = BlossomServers.find(s => req.url().startsWith(s))
    if (blossom) {
      if (url.pathname === "/upload" && req.method() === "HEAD") {
        return route.fulfill({ status: 200, headers: cors })
      }
      if (url.pathname === "/upload" && req.method() === "PUT") {
        const body = req.postDataBuffer() ?? Buffer.alloc(0)
        const sha256 = createHash("sha256").update(body).digest("hex")
        blobs.set(sha256, { type: req.headers()["content-type"] ?? "image/png", size: body.length })
        log.uploads.push({ server: blossom, sha256, size: body.length })
        return json(route, descriptor(blossom, sha256))
      }
      if (url.pathname === "/report" && req.method() === "PUT") {
        log.reports.push({ server: url.origin, event: req.postDataJSON() as NostrEvent })
        return route.fulfill({ status: 201, headers: cors })
      }
      if (url.pathname === "/mirror" && req.method() === "PUT") {
        const { url: source } = req.postDataJSON() as { url: string }
        log.mirrors.push({ server: blossom, url: source })
        const sha256 = source.split("/").pop()?.split(".")[0] ?? ""
        return json(route, descriptor(blossom, sha256))
      }
      if (url.pathname.startsWith("/list/")) {
        return json(
          route,
          [...blobs.keys()].map(sha => descriptor(blossom, sha)),
        )
      }
    }
    if (req.resourceType() === "image" || /\.(png|jpe?g|gif|webp|svg)$/i.test(url.pathname)) {
      return route.fulfill({ status: 200, contentType: "image/png", headers: cors, body: png })
    }
    return json(route, {}, 404)
  })
  return log
}
