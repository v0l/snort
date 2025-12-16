import type { NostrEvent, OkResponse, ReqCommand, ReqFilter, TaggedNostrEvent } from "./nostr";
import type { CacheRelay } from "./cache-relay";
import type { Connection } from "./connection";
import { NoteCollection } from "./note-collection";
import { v4 as uuid } from "uuid";

/**
 * Use a regular connection as a CacheRelay
 */
export class ConnectionCacheRelay implements CacheRelay {
  #eventsSent = new Set<string>();

  constructor(readonly connection: Connection) {}

  async event(ev: NostrEvent): Promise<OkResponse> {
    if (this.#eventsSent.has(ev.id))
      return {
        ok: true,
        id: ev.id,
        message: "duplicate",
      } as OkResponse;
    this.#eventsSent.add(ev.id);
    return await this.connection.publish(ev);
  }

  query(req: ReqCommand): Promise<Array<TaggedNostrEvent>> {
    const id = uuid();
    return new Promise((resolve, reject) => {
      const results = new NoteCollection();
      const evh = (s: string, e: TaggedNostrEvent) => {
        if (s === id) {
          results.add(e);
        }
      };
      const eoh = (s: string) => {
        if (s === id) {
          resolve(results.snapshot);
          this.connection.closeRequest(id);
          this.connection.off("unverifiedEvent", evh);
          this.connection.off("eose", eoh);
          this.connection.off("closed", eoh);
        }
      };
      this.connection.on("unverifiedEvent", evh);
      this.connection.on("eose", eoh);
      this.connection.on("closed", eoh);
      this.connection.request(["REQ", id, ...(req.slice(2) as Array<ReqFilter>)]);
    });
  }

  delete(req: ReqCommand): Promise<string[]> {
    // ignored
    return Promise.resolve([]);
  }
}
