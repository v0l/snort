import { SnortContext } from "@snort/system-react"
import { StrictMode } from "react"
import { renderToString } from "react-dom/server"
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
} from "react-router-dom/server"

import { IntlProvider } from "@/Components/IntlProvider/IntlProvider"
import { RootRoutes } from "@/Pages/Root/RootRoutes"
import { System } from "@/system"
import { SpotlightContextWrapper } from "./Components/Spotlight/context"
import Layout from "./Pages/Layout"

export interface RenderOptions {
  url: string
}

/** Load and flatten translation messages for a locale. */
async function loadMessages(locale: string): Promise<Record<string, string>> {
  if (locale === "en") return {}
  try {
    // Try exact locale first (e.g., de_DE), then fallback to language only (e.g., de)
    let mod
    try {
      mod = await import(`../translations/${locale}.json`)
    } catch {
      // Try language-only fallback
      const langOnly = locale.split("_")[0]
      if (langOnly !== locale) {
        mod = await import(`../translations/${langOnly}.json`)
      } else {
        throw new Error(`No translations found for ${locale}`)
      }
    }
    const raw = mod.default as Record<string, string | { defaultMessage: string }>
    const flat: Record<string, string> = {}
    for (const [k, v] of Object.entries(raw)) {
      flat[k] = typeof v === "string" ? v : v.defaultMessage
    }
    return flat
  } catch {
    return {}
  }
}

const RTL_LOCALES = new Set(["ar", "he", "fa", "ur"])

/**
 * SSR locale state — set by the server, read by the client during hydration.
 */
let ssrLocale: string | undefined
let ssrMessages: Record<string, string> | undefined

/** Set the SSR locale + messages so they're included in the cache script. */
function setSSRLocale(locale: string, messages: Record<string, string>): void {
  ssrLocale = locale
  ssrMessages = messages
}

/**
 * Generate a `<script>` tag that exposes the SSR locale as
 * `window.__SSR_LOCALE__` and messages as `window.__SSR_MESSAGES__` so the
 * client can read them during hydration.
 */
function serializeCacheScript(): string {
  const parts: string[] = []
  if (ssrLocale) {
    parts.push(
      `window.__SSR_LOCALE__=${JSON.stringify(ssrLocale).replace(/</g, "\\u003c")}`,
    )
  }
  if (ssrMessages && Object.keys(ssrMessages).length > 0) {
    parts.push(
      `window.__SSR_MESSAGES__=${JSON.stringify(ssrMessages).replace(/</g, "\\u003c")}`,
    )
  }
  if (parts.length === 0) return ""
  return `<script>${parts.join(";")}</script>`
}

/**
 * Detect locale from Accept-Language header or cookie.
 * Falls back to "en" if no locale is detected.
 */
export function detectLocale(acceptLanguage: string | null, cookie: string | null): string {
  // Check cookie first for user preference
  if (cookie) {
    const localeMatch = cookie.match(/locale=([^;]+)/)
    if (localeMatch) {
      const locale = localeMatch[1].toLowerCase().split("-")[0]
      if (!RTL_LOCALES.has(locale) && locale !== "en") {
        return locale
      }
    }
  }

  // Check Accept-Language header
  if (acceptLanguage) {
    const preferred = acceptLanguage.split(",")[0].split("-")[0].toLowerCase()
    if (!RTL_LOCALES.has(preferred) && preferred !== "en") {
      return preferred
    }
  }

  return "en"
}

/**
 * Server-side rendering entry point for Snort
 * Uses React Router's createStaticHandler for data loading with loaders.
 * 
 * This enables SEO-friendly rendering of threads, profiles, and other content
 * by pre-rendering pages on the server before sending to the client.
 * 
 * Route loaders in RootRoutes are automatically called by createStaticHandler.
 */
export async function renderPage({ url }: RenderOptions): Promise<string> {
  return render(url, "en", null, null)
}

/**
 * Render the app for a given URL with locale support.
 * 
 * Loaders attached to routes are called automatically by createStaticHandler.
 * The Accept-Language header is forwarded so locale-aware loaders work correctly.
 */
export async function render(
  url: string,
  locale = "en",
  acceptLanguage?: string | null,
  cookie?: string | null,
): Promise<{
  html: string
  head: string
  cacheScript: string
  lang: string
  dir: string
}> {
  const handler = createStaticHandler(RootRoutes)

  const headers: Record<string, string> = { accept: "text/html" }
  if (acceptLanguage) headers["accept-language"] = acceptLanguage
  if (cookie) headers["cookie"] = cookie

  const fetchRequest = new Request(`http://localhost${url}`, {
    method: "GET",
    headers,
  })

  const context = await handler.query(fetchRequest)

  if (context instanceof Response) {
    return { html: "", head: "", cacheScript: "", lang: locale, dir: "ltr" }
  }

  const router = createStaticRouter(handler.dataRoutes, context)
  const messages = await loadMessages(locale)
  const dir = RTL_LOCALES.has(locale) ? "rtl" : "ltr"

  const html = renderToString(
    <StrictMode>
      <IntlProvider locale={locale} messages={messages} defaultLocale="en">
        <SnortContext.Provider value={System}>
          <SpotlightContextWrapper>
            <StaticRouterProvider router={router} context={context} />
          </SpotlightContextWrapper>
        </SnortContext.Provider>
      </IntlProvider>
    </StrictMode>,
  )

  // Inject locale + messages into the page so the client hydrates with matching state.
  setSSRLocale(locale, messages)
  const cacheScript = serializeCacheScript()

  return { html, head: "", cacheScript, lang: locale, dir }
}
