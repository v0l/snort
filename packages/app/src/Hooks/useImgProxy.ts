import { useMemo } from "react"
import usePreferences from "@/Hooks/usePreferences"
import { proxyImg } from "@snort/shared"

export default function useImgProxy() {
  const imgProxyConfig = usePreferences(s => s.imgProxyConfig)

  const proxy = useMemo(
    () => (url: string, resize?: number, sha256?: string) => proxyImg(url, imgProxyConfig, resize, sha256),
    [imgProxyConfig],
  )

  return {
    proxy,
  }
}
