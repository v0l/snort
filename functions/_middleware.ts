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
    // `next`'s body is consumed below (it's POSTed upstream), so keep the
    // bytes around to serve the unmodified page whenever the rewrite
    // fails, times out, or comes back empty — returning `next` after
    // reading it throws "ReadableStream is disturbed".
    let page: ArrayBuffer | undefined;
    try {
      let id = u.pathname.split("/").at(-1);
      if (!isEntityPath && nostrAddress) {
        id = `${id}@${HOST}`;
      }
      const fetchApi = `https://nostr-rs-api.v0l.io/opengraph/${id}?canonical=${encodeURIComponent(
        `https://${HOST}/%s`,
      )}`;
      console.log("Fetching tags from: ", fetchApi);
      page = await next.arrayBuffer();
      const rsp = await fetch(fetchApi, {
        method: "POST",
        body: page,
        headers: {
          "user-agent": `SnortFunctions/1.0 (https://${HOST})`,
          "content-type": "text/html",
          accept: "text/html",
        },
        // Don't let a hung upstream stall the user-facing request; the
        // catch below serves the unmodified page instead.
        signal: AbortSignal.timeout(3_000),
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
    if (page !== undefined) {
      return new Response(page, {
        // The asset pipeline serves the 404.html SPA shell with status 404
        // for routes without a matching asset; the client router decides
        // the real outcome, so serve the shell as 200.
        status: next.status === 404 ? 200 : next.status,
        statusText: next.statusText,
        headers: next.headers,
      });
    }
  }
  return next;
};
