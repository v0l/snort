import { type DVMJobInput, DVMJobRequest, NostrLink, PrivateKeySigner, type TaggedNostrEvent } from "@snort/system"
import { useEffect, useMemo, useState } from "react"
import useEventPublisher from "./useEventPublisher"

// Session-scoped ephemeral signer for anonymous DVM requests
let ephemeralSigner: PrivateKeySigner | undefined
function getEphemeralSigner() {
  if (!ephemeralSigner) {
    ephemeralSigner = PrivateKeySigner.random()
  }
  return ephemeralSigner
}

/**
 * Request a DVM to return a list of links
 */
export default function useDVMLinks(
  kind: number,
  provider?: string,
  inputs?: Array<DVMJobInput>,
  params?: Record<string, string>,
  relays?: Array<string>,
  parser?: (c: string) => Array<NostrLink>,
) {
  const cacheKey = `${provider ? `${provider}:` : ""}${kind}${relays ? `:${relays.join(",")}` : ""}`
  const { publisher, system } = useEventPublisher()
  const [result, setResult] = useState<TaggedNostrEvent>()
  const [error, setError] = useState<Error>()

  // Use ephemeral signer for logged-out users
  const signer = useMemo(() => publisher?.signer ?? getEphemeralSigner(), [publisher])

  const req = useMemo(() => {
    const job = new DVMJobRequest(kind)
    if (provider) {
      job.setServiceProvider(provider)
    }
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        job.setParam(k, v)
      }
    }
    if (inputs) {
      for (const i of inputs) {
        job.addInput(i)
      }
    }
    relays?.forEach(r => job.addRelay(r))
    return job
  }, [kind, provider, inputs, params, relays])

  useEffect(() => {
    if (!system) {
      return
    }
    const k = `dvm-links:${cacheKey}`
    const cached = window.sessionStorage.getItem(k)
    if (cached) {
      try {
        const jCached = JSON.parse(cached) as TaggedNostrEvent | undefined
        if (jCached && "content" in jCached) {
          setResult(jCached)
          return
        } else {
          window.sessionStorage.removeItem(k)
        }
      } catch {
        window.sessionStorage.removeItem(k)
      }
    }
    setResult(undefined)

    req.on("result", e => {
      setResult(e)
      window.sessionStorage.setItem(k, JSON.stringify(e))
    })
    req.on("error", e => {
      setError(new Error(e))
    })
    req.request(signer, system, relays)
    return () => {
      req.abort(system)
    }
  }, [req, signer, system, cacheKey, relays])

  const links = useMemo(() => {
    if (!result) return
    if (parser) {
      return parser(result.content)
    } else {
      return NostrLink.fromTags(JSON.parse(result.content) as Array<Array<string>>)
    }
  }, [result, parser])

  return { result, req, links, error }
}
