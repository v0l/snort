interface Env {
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string;

  const next = await context.next();
  console.debug(next.status);
  console.debug("Fetching data for: ", id);

  const rsp = await fetch(`https://api.snort.social/api/v1/og/tag/e/${id}`, {
    method: "POST",
    body: await next.arrayBuffer(),
    headers: {
      "content-type": "text/plain"
    }
  });
  console.debug(rsp.status, rsp.statusText);
  const body = await rsp.text();
  return new Response(body, {
    headers: {
      "content-type": "text/html"
    }
  });
}