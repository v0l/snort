/**
 * Server-side render function.
 *
 * Single-pass render with pre-fetched data:
 * 1. Connect to relays (with per-relay 8s timeout)
 * 2. System.Fetch() for profile/note data (resolves on first EOSE)
 * 3. Pre-seed profileLoader cache so useUserProfile() returns data immediately
 * 4. Single renderToString with real components → Helmet captures SEO tags
 *
 * Uses the SAME React components as the client SPA via StaticRouter + SnortContext.
 */
// MUST import mock FIRST before any other imports
import "./ssr-mock"

import type { ComponentType } from "react"
import { renderToString } from "react-dom/server"
import { HelmetData, HelmetProvider } from "react-helmet-async"
import { StaticRouter } from "react-router-dom"
import { SnortContext } from "@snort/system-react"
import {
  NostrSystem,
  RequestBuilder,
  EventKind,
  tryParseNostrLink,
  type TaggedNostrEvent,
  type CachedMetadata,
  mapEventToProfile,
} from "@snort/system"
import { NostrPrefix } from "@snort/shared"
import { IntlProvider } from "react-intl"

import enMessages from "@/translations/en.json"

// ---------------------------------------------------------------------------
// Persistent SSR NostrSystem
// ---------------------------------------------------------------------------

let _ssrSystem: NostrSystem | null = null
let _ssrConnected: string[] = []

async function getSSRSystem(): Promise<{ system: NostrSystem; connected: string[] }> {
  if (_ssrSystem) return { system: _ssrSystem, connected: _ssrConnected }

  const relaysConfig = (CONFIG as Record<string, unknown>).defaultRelays as Record<string, { read: boolean; write: boolean }> ?? {}

  _ssrSystem = new NostrSystem({
    automaticOutboxModel: false,
    buildFollowGraph: false,
    disableSyncModule: true,
  })

  const urls = Object.entries(relaysConfig)
    .filter(([url, opts]) => opts.read && url.startsWith("wss://"))
    .slice(0, 4)

  const results = await Promise.allSettled(
    urls.map(([url]) => timeout(8000, _ssrSystem!.ConnectToRelay(url, { read: true, write: false }))),
  )

  _ssrConnected = urls.filter((_, i) => results[i].status === "fulfilled").map(([url]) => url)
  console.log(`SSR: connected to ${_ssrConnected.length}/${urls.length} relays:`, _ssrConnected)

  return { system: _ssrSystem, connected: _ssrConnected }
}

function timeout<T>(ms: number, promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    promise.then(v => { clearTimeout(t); resolve(v) }, e => { clearTimeout(t); reject(e) })
  })
}

// ---------------------------------------------------------------------------
// Data fetching (direct System.Fetch — resolves on first EOSE)
// ---------------------------------------------------------------------------

async function fetchProfile(system: NostrSystem, hexPubkey: string): Promise<CachedMetadata | null> {
  // MUST be hex — authors() filters out non-64-char strings
  if (hexPubkey.length !== 64) return null

  const rb = new RequestBuilder(`ssr-profile:${hexPubkey}`)
  rb.withFilter().kinds([EventKind.SetMetadata]).authors([hexPubkey]).limit(1)

  const events = await system.Fetch(rb)
  const ev = events.find(e => e.pubkey === hexPubkey)
  if (!ev) return null

  const profile = mapEventToProfile(ev)
  if (profile) {
    await system.profileLoader.cache.set(profile)
  }
  return profile ?? null
}

async function fetchNote(system: NostrSystem, hexNoteId: string): Promise<TaggedNostrEvent | null> {
  if (hexNoteId.length !== 64) return null

  const rb = new RequestBuilder(`ssr-note:${hexNoteId}`)
  rb.withFilter().ids([hexNoteId]).kinds([EventKind.TextNote]).limit(1)

  const events = await system.Fetch(rb)
  return events.find(e => e.id === hexNoteId) ?? null
}

// ---------------------------------------------------------------------------
// Route resolution — always produces hex fetchId
// ---------------------------------------------------------------------------

type SSRRoute = {
  type: "profile" | "event"
  component: ComponentType<{ id?: string }>
  /** Always hex — safe for relay queries */
  hexFetchId: string
  /** Bech32 or hex string — passed as `id` prop to the component */
  componentId: string
}

function hexPubkey(id: string): string | null {
  if (id.length === 64 && /^[0-9a-fA-F]+$/.test(id)) return id.toLowerCase()
  try {
    const nav = tryParseNostrLink(id)
    if (nav && (nav.type === NostrPrefix.PublicKey || nav.type === NostrPrefix.Profile)) return nav.id
  } catch { /* not a valid bech32 */ }
  return null
}

function hexNoteId(id: string): string | null {
  if (id.length === 64 && /^[0-9a-fA-F]+$/.test(id)) return id.toLowerCase()
  try {
    const nav = tryParseNostrLink(id)
    if (nav && (nav.type === NostrPrefix.Event || nav.type === NostrPrefix.Note || nav.type === NostrPrefix.Address)) return nav.id
  } catch { /* not a valid bech32 */ }
  return null
}

async function resolveRoute(url: string): Promise<SSRRoute | null> {
  const path = new URL(`http://localhost${url}`).pathname
  const segments = path.split("/").filter(Boolean)
  const first = segments[0] ?? ""
  const routeId = segments[1] ?? ""

  // /p/:id — routeId may be hex or bech32
  if (first === "p" && routeId) {
    const hexId = hexPubkey(routeId)
    if (hexId) {
      const { default: ProfilePage } = await import("@/Pages/Profile/ProfilePage")
      return { type: "profile", component: ProfilePage, hexFetchId: hexId, componentId: routeId }
    }
  }

  // /e/:id
  if (first === "e" && routeId) {
    const hexId = hexNoteId(routeId)
    if (hexId) {
      const { ThreadRoute } = await import("@/Components/Event/Thread/ThreadRoute")
      return { type: "event", component: ThreadRoute, hexFetchId: hexId, componentId: routeId }
    }
  }

  // /:link — bech32 entity
  const nav = first ? tryParseNostrLink(first) : null
  if (nav) {
    switch (nav.type) {
      case NostrPrefix.PublicKey:
      case NostrPrefix.Profile: {
        const { default: ProfilePage } = await import("@/Pages/Profile/ProfilePage")
        return { type: "profile", component: ProfilePage, hexFetchId: nav.id, componentId: nav.encode() }
      }
      case NostrPrefix.Event:
      case NostrPrefix.Note:
      case NostrPrefix.Address: {
        const { ThreadRoute } = await import("@/Components/Event/Thread/ThreadRoute")
        return { type: "event", component: ThreadRoute, hexFetchId: nav.id, componentId: nav.encode() }
      }
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Single render with providers
// ---------------------------------------------------------------------------

function renderWithProviders(system: NostrSystem, url: string, Component: ComponentType<{ id?: string }>, id: string) {
  const helmetData = new HelmetData({})

  const html = renderToString(
    <HelmetProvider context={helmetData.context}>
      <IntlProvider locale="en" messages={enMessages as Record<string, string>}>
        <SnortContext.Provider value={system}>
          <StaticRouter location={url}>
            <Component id={id} />
          </StaticRouter>
        </SnortContext.Provider>
      </IntlProvider>
    </HelmetProvider>,
  )

  const { helmet: helmetState } = helmetData.context
  let title = ""
  let headTags = ""
  if (helmetState) {
    title = helmetState.title?.toString() ?? ""
    headTags = [helmetState.meta?.toString(), helmetState.link?.toString(), helmetState.script?.toString()]
      .filter(Boolean)
      .join("\n")
  }
  return { html, head: headTags, title, helmetState }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function render(url: string) {
  const { system, connected } = await getSSRSystem()
  const route = await resolveRoute(url)

  if (route && connected.length > 0) {
    // Pre-fetch data (resolves on first EOSE, not 30s)
    if (route.type === "profile") {
      await fetchProfile(system, route.hexFetchId)
    } else if (route.type === "event") {
      const note = await fetchNote(system, route.hexFetchId)
      if (note) {
        await fetchProfile(system, note.pubkey)
      }
    }

    const result = renderWithProviders(system, url, route.component, route.componentId)

    return {
      html: `<div id="ssr-shell">${result.html}</div>`,
      head: result.head,
      title: result.title,
      status: 200,
      helmetState: result.helmetState,
      hydrationData: system.getHydrationData(),
      redirect: undefined,
    }
  }

  return { html: "", head: "", title: "", status: 200, helmetState: null, hydrationData: {}, redirect: undefined }
}