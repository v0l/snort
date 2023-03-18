
interface Env {
  KV: KVNamespace;
}

interface RawEvent {
  id: string,
  content: string,
  created_at: string,
  pubkey: string
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string;

  const next = await context.next();
  console.debug(next.status);
  console.debug("Fetching data for: ", id);

  const rsp = await fetch(`https://api.snort.social/api/v1/raw/e/${id}`);
  console.debug(rsp.status, rsp.statusText);
  if (rsp.ok) {
    const json: RawEvent = await rsp.json();
    console.debug(json);

  }
  return new Response("test");
}