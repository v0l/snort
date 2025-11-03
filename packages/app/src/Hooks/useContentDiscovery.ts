import { RequestBuilder } from "@snort/system";
import { useMemo } from "react";
import { useRequestBuilder } from "@snort/system-react";
import useDVMLinks from "./useDvmLinks";

export default function useContentDiscovery(serviceProvider: string, relays?: Array<string>) {
  const { req, links, error } = useDVMLinks(5300, serviceProvider, undefined, undefined, relays);

  const sub = useMemo(() => {
    const rb = new RequestBuilder(`content-discovery:${req.id}`);
    if (links) {
      const f = rb.withFilter();
      links.forEach(p => f.link(p));
    }
    return rb;
  }, [req, links]);

  const data = useRequestBuilder(sub);
  return {
    req,
    data,
    links,
    error,
  };
}
