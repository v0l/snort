import { Helmet } from "react-helmet-async"

/**
 * Minimal SSR shell that renders on the server and hydrates on the client.
 * Shows a loading state while the full app initializes.
 */
export function SSRShell() {
  return (
    <>
      <Helmet>
        <title>{CONFIG.appTitle}</title>
      </Helmet>
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center gap-4">
          {/* Logo / Brand */}
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-pink-600">
            <svg
              className="h-10 w-10 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
          </div>

          {/* Loading spinner */}
          <div className="relative h-8 w-8">
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-orange-500"></div>
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-pink-600" style={{ animationDelay: "-0.2s", animationDuration: "0.8s" }}></div>
          </div>

          {/* Loading text */}
          <p className="text-sm text-gray-400">Loading {CONFIG.appName}...</p>
        </div>
      </div>
    </>
  )
}
