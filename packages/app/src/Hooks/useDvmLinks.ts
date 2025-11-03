import { NostrLink, DVMJobRequest, DVMJobInput } from "@snort/system";
import { useState, useMemo, useEffect } from "react";
import useEventPublisher from "./useEventPublisher";

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
  const cacheKey = `${provider ? `${provider}:` : ""}${kind}${relays ? `:${relays.join(",")}` : ""}`;
  const { publisher, system } = useEventPublisher();
  const [links, setLinks] = useState<Array<NostrLink>>();
  const [error, setError] = useState<Error>();

  const req = useMemo(() => {
    const job = new DVMJobRequest(kind);
    if (provider) {
      job.setServiceProvider(provider);
    }
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        job.setParam(k, v);
      }
    }
    if (inputs) {
      for (const i of inputs) {
        job.addInput(i);
      }
    }
    relays?.forEach(r => job.addRelay(r));
    return job;
  }, [kind, provider, inputs, params, relays]);

  useEffect(() => {
    if (!system || !publisher) {
      return;
    }
    const k = `dvm-links:${cacheKey}`;

    function setResult(content: string) {
      try {
        const links = parser?.(content) ?? NostrLink.fromTags(JSON.parse(content) as Array<Array<string>>);
        setLinks(links);
      } catch (e) {
        // ignore
        setLinks([]);
      }
    }

    const cached = window.sessionStorage.getItem(k);
    if (cached) {
      setResult(cached);
      return;
    }
    setLinks(undefined);

    req.on("result", e => {
      setResult(e.content);
      window.sessionStorage.setItem(k, e.content);
    });
    req.on("error", e => {
      setError(new Error(e));
    });
    req.request(publisher.signer, system, relays);
    return () => {
      req.abort(system);
    };
  }, [req, publisher, system]);

  return { req, links, error };
}
