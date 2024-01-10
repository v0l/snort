interface Env {}

import { bech32 } from "./bech32";
import { fromHex } from "./hex";

interface NostrJson {
  names: Record<string, string>;
}

const HOST = "snort.social";

async function fetchNostrAddress(name: string, domain: string) {
  try {
    const res = await fetch(`https://${domain}/.well-known/nostr.json?name=${encodeURIComponent(name)}`, {
      signal: AbortSignal.timeout(1000),
    });
    const data: NostrJson = await res.json();
    const match = Object.keys(data.names).find(n => {
      return n.toLowerCase() === name.toLowerCase();
    });
    return match ? data.names[match] : undefined;
  } catch {
    // ignored
  }
}

export const onRequest: PagesFunction<Env> = async context => {
  const u = new URL(context.request.url);

  const prefixes = ["npub1", "nprofile1", "naddr1", "nevent1", "note1"];
  const isEntityPath = prefixes.some(
    a => u.pathname.startsWith(`/${a}`) || u.pathname.startsWith(`/e/${a}`) || u.pathname.startsWith(`/p/${a}`),
  );
  const nostrAddress = u.pathname.match(/^\/([a-zA-Z0-9_]+)$/i);
  const next = await context.next();
  if (u.pathname != "/" && (isEntityPath || nostrAddress)) {
    //console.log("Handeling path: ", u.pathname, isEntityPath, nostrAddress[1]);
    try {
      let id = u.pathname.split("/").at(-1);
      if (!isEntityPath && nostrAddress) {
        const pubkey = await fetchNostrAddress(id, HOST);
        if (pubkey) {
          id = bech32.encode("npub", bech32.toWords(fromHex(pubkey)));
        } else {
          return next;
        }
      }
      const fetchApi = `http://nostr.api.v0l.io/api/v1/opengraph/${id}?canonical=${encodeURIComponent(
        `https://${HOST}/%s`,
      )}`;
      console.log("Fetching tags from: ", fetchApi);
      const rsp = await fetch(fetchApi, {
        method: "POST",
        body: await next.arrayBuffer(),
        headers: {
          "user-agent": `SnortFunctions/1.0 (https://${HOST})`,
          "content-type": "text/html",
          accept: "text/html",
        },
      });
      if (rsp.ok) {
        const body = await rsp.text();
        if (body.length > 0) {
          return new Response(body, {
            headers: {
              "content-type": "text/html",
            },
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  }
  return next;
};
