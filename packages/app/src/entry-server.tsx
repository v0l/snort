import { SnortContext } from "@snort/system-react"
import { StrictMode } from "react"
import { renderToString } from "react-dom/server"
import { StaticRouter } from "react-router-dom/server"

import { IntlProvider } from "@/Components/IntlProvider/IntlProvider"
import { RootRoutes } from "@/Pages/Root/RootRoutes"
import { System } from "@/system"
import { SpotlightContextWrapper } from "./Components/Spotlight/context"
import Layout from "./Pages/Layout"

export interface RenderOptions {
  url: string
}

/**
 * Server-side rendering entry point for Snort
 * Renders the React app to a string for SSR.
 * 
 * This enables SEO-friendly rendering of threads, profiles, and other content
 * by pre-rendering pages on the server before sending to the client.
 */
export function renderPage({ url }: RenderOptions): string {
  // Initialize system for SSR
  const system = System

  // Render the app to HTML string
  const html = renderToString(
    <StrictMode>
      <IntlProvider>
        <SnortContext.Provider value={system}>
          <SpotlightContextWrapper>
            <StaticRouter location={url}>
              <Layout />
            </StaticRouter>
          </SpotlightContextWrapper>
        </SnortContext.Provider>
      </IntlProvider>
    </StrictMode>,
  )

  return html
}
