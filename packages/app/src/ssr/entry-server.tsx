import { setServerLocation } from "./globals"

import { SnortContext } from "@snort/system-react"
import { renderToString } from "react-dom/server"
import { HelmetProvider, type HelmetServerState } from "react-helmet-async"
import { type MessageFormatElement, IntlProvider as ReactIntlProvider } from "react-intl"
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from "react-router-dom"

import { SpotlightContextWrapper } from "@/Components/Spotlight/context"
import { makeRoutes } from "@/routes"
import enMessages from "@/translations/en.json"

import { setStatus, takeStatus } from "./state"
import { ServerSystem } from "./system"

interface RenderInput {
  url: string
  now: number
  origin: string
}

const system = new ServerSystem()
const handler = createStaticHandler(makeRoutes(async () => null))
const messages = enMessages as unknown as Record<string, MessageFormatElement[]>

async function render(input: RenderInput) {
  setServerLocation(input.url, input.origin)
  const now = input.now * 1000
  Date.now = () => now
  system.reset()
  setStatus(200)
  const request = new Request(new URL(input.url, input.origin).href)
  const context = await handler.query(request)
  if (context instanceof Response) {
    const location = context.headers.get("Location")
    return { html: "", status: context.status, head: location ? { redirect: location } : {}, data: {} }
  }
  setStatus(context.statusCode)
  const router = createStaticRouter(handler.dataRoutes, context)
  const helmetContext: { helmet?: HelmetServerState | null } = {}
  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <ReactIntlProvider locale="en" defaultLocale="en" messages={messages}>
        <SnortContext.Provider value={system as never}>
          <SpotlightContextWrapper>
            <StaticRouterProvider router={router} context={context} hydrate={false} />
          </SpotlightContextWrapper>
        </SnortContext.Provider>
      </ReactIntlProvider>
    </HelmetProvider>,
  )
  return {
    html,
    status: takeStatus(),
    head: {},
    data: { now: input.now, origin: input.origin, ...system.data() },
  }
}

;(globalThis as { ssrRender?: (json: string) => Promise<string> }).ssrRender = async json =>
  JSON.stringify(await render(JSON.parse(json)))
