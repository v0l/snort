import { useEffect } from "react";

declare global {
    interface Window {
        webln?: {
            enabled: boolean,
            enable: () => Promise<void>,
            sendPayment: (pr: string) => Promise<any>
        }
    }
}

export default function useWebln(enable = true) {
  const maybeWebLn = "webln" in window ? window.webln : null

  useEffect(() => {
    if (maybeWebLn && !maybeWebLn.enabled && enable) {
      maybeWebLn.enable().catch((error) => {
        console.debug("Couldn't enable WebLN")
      })
    }
  }, [maybeWebLn, enable])

  return maybeWebLn
}
