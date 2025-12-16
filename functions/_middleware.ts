type Env = {}

const HOST = "snort.social";

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
        id = `${id}@${HOST}`;
      }
      const fetchApi = `https://nostr-rs-api.v0l.io/opengraph/${id}?canonical=${encodeURIComponent(
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
              ...Object.fromEntries(rsp.headers.entries()),
              "cache-control": "no-cache",
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
