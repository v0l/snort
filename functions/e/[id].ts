interface Env {
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string;

  const next = await context.next();
  try {
    const rsp = await fetch(`https://api.snort.social/api/v1/og/tag/e/${id}`, {
      method: "POST",
      body: await next.arrayBuffer(),
      headers: {
        "user-agent": "Snort-Functions/1.0 (https://snort.social)",
        "content-type": "text/plain"
      }
    });
    if (rsp.ok) {
      const body = await rsp.text();
      if (body.length > 0) {
        return new Response(body, {
          headers: {
            "content-type": "text/html"
          }
        });
      }
    }
  } catch {
    // ignore
  }
  return next;
}