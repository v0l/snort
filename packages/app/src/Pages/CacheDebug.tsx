import type { NostrEvent, TaggedNostrEvent } from "@snort/system";
import { SnortContext } from "@snort/system-react";
import { use, useState } from "react";

import AsyncButton from "@/Components/Button/AsyncButton";

export function DebugPage() {
  const system = use(SnortContext);
  const [filter, setFilter] = useState("");
  const [event, setEvent] = useState("");
  const [results, setResult] = useState<Array<TaggedNostrEvent>>([]);

  async function search() {
    if (filter && system.cacheRelay) {
      const r = await system.cacheRelay.query(["REQ", "test", JSON.parse(filter)]);
      setResult(r.map(a => ({ ...a, relays: [] })));
    }
  }

  async function insert() {
    if (event && system.cacheRelay) {
      const r = await system.cacheRelay.event(JSON.parse(event) as NostrEvent);
      setResult([
        {
          content: JSON.stringify(r),
        } as unknown as TaggedNostrEvent,
      ]);
    }
  }

  async function removeEvents() {
    if (filter && system.cacheRelay) {
      const r = await system.cacheRelay.delete(["REQ", "delete-events", JSON.parse(filter)]);
      setResult(r.map(a => ({ id: a }) as TaggedNostrEvent));
    }
  }
  return (
    <div className="flex flex-col gap-2">
      <h3>Cache Query</h3>
      <textarea value={filter} onChange={e => setFilter(e.target.value)} placeholder="nostr filter" />
      <AsyncButton onClick={() => search()}>Query</AsyncButton>
      <AsyncButton onClick={() => removeEvents()} className="!bg-red-500">
        Delete
      </AsyncButton>

      <h3>Manual Insert</h3>
      <textarea value={event} onChange={e => setEvent(e.target.value)} placeholder="nostr event" />
      <AsyncButton onClick={() => insert()}>Insert</AsyncButton>
      <div className="p-4 overflow-hidden">
        <h4>Results: {results.length}</h4>
        {results?.map(a => (
          <pre key={a.id} className="text-mono text-xs text-pretty">
            {JSON.stringify(a, undefined, 2)}
          </pre>
        ))}
      </div>
    </div>
  );
}
