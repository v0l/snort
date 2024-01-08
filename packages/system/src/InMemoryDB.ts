import { ID, ReqFilter as Filter, STR, TaggedNostrEvent, UID } from ".";
import loki from "lokijs";

type PackedNostrEvent = {
  id: UID;
  pubkey: number;
  kind: number;
  tags: Array<string | UID>[];
  flatTags: string[];
  sig: string;
  created_at: number;
  content?: string;
  relays: string[];
  saved_at: number;
};

const DEFAULT_MAX_SIZE = 5000;

class InMemoryDB {
  private loki = new loki("EventDB");
  private eventsCollection: Collection<PackedNostrEvent>;
  private maxSize: number;

  constructor(maxSize = DEFAULT_MAX_SIZE) {
    this.maxSize = maxSize;
    this.eventsCollection = this.loki.addCollection("events", {
      unique: ["id"],
      indices: ["pubkey", "kind", "flatTags", "created_at", "saved_at"],
    });
    this.startRemoveOldestInterval();
  }

  private startRemoveOldestInterval() {
    const removeOldest = () => {
      this.removeOldest();
      setTimeout(() => removeOldest(), 3000);
    };
    setTimeout(() => removeOldest(), 3000);
  }

  get(id: string): TaggedNostrEvent | undefined {
    const event = this.eventsCollection.by("id", ID(id)); // throw if db not ready yet?
    if (event) {
      return this.unpack(event);
    }
  }

  has(id: string): boolean {
    return !!this.eventsCollection.by("id", ID(id));
  }

  // map to internal UIDs to save memory
  private pack(event: TaggedNostrEvent): PackedNostrEvent {
    return {
      id: ID(event.id),
      pubkey: ID(event.pubkey),
      sig: event.sig,
      kind: event.kind,
      tags: event.tags.map(tag => {
        if (["e", "p"].includes(tag[0]) && typeof tag[1] === "string") {
          return [tag[0], ID(tag[1] as string), ...tag.slice(2)];
        } else {
          return tag;
        }
      }),
      flatTags: event.tags.filter(tag => ["e", "p", "d"].includes(tag[0])).map(tag => `${tag[0]}_${ID(tag[1])}`),
      created_at: event.created_at,
      content: event.content,
      relays: event.relays,
      saved_at: Date.now(),
    };
  }

  private unpack(packedEvent: PackedNostrEvent): TaggedNostrEvent {
    return <TaggedNostrEvent>{
      id: STR(packedEvent.id),
      pubkey: STR(packedEvent.pubkey),
      sig: packedEvent.sig,
      kind: packedEvent.kind,
      tags: packedEvent.tags.map(tag => {
        if (["e", "p"].includes(tag[0] as string) && typeof tag[1] === "number") {
          return [tag[0], STR(tag[1] as number), ...tag.slice(2)];
        } else {
          return tag;
        }
      }),
      created_at: packedEvent.created_at,
      content: packedEvent.content,
      relays: packedEvent.relays,
    };
  }

  handleEvent(event: TaggedNostrEvent): boolean {
    if (!event || !event.id || !event.created_at) {
      throw new Error("Invalid event");
    }

    const id = ID(event.id);
    if (this.eventsCollection.by("id", id)) {
      return false; // this prevents updating event.relays?
    }

    const packed = this.pack(event);

    // we might want to limit the kinds of events we save, e.g. no kind 0, 3 or only 1, 6

    try {
      this.eventsCollection.insert(packed);
    } catch (e) {
      return false;
    }

    return true;
  }

  remove(eventId: string): void {
    const id = ID(eventId);
    this.eventsCollection.findAndRemove({ id });
  }

  removeOldest(): void {
    const count = this.eventsCollection.count();
    console.log("InMemoryDB: count", count, this.maxSize);
    if (count > this.maxSize) {
      console.log("InMemoryDB: removing oldest events", count - this.maxSize);
      this.eventsCollection
        .chain()
        .simplesort("saved_at")
        .limit(count - this.maxSize)
        .remove();
    }
  }

  find(filter: Filter, callback: (event: TaggedNostrEvent) => void): void {
    this.findArray(filter).forEach(event => {
      callback(event);
    });
  }

  findArray(filter: Filter): TaggedNostrEvent[] {
    const query = this.constructQuery(filter);

    const searchRegex = filter.search ? new RegExp(filter.search, "i") : undefined;
    let chain = this.eventsCollection
      .chain()
      .find(query)
      .where((e: PackedNostrEvent) => {
        if (searchRegex && !e.content?.match(searchRegex)) {
          return false;
        }
        return true;
      })
      .simplesort("created_at", true);

    if (filter.limit) {
      chain = chain.limit(filter.limit);
    }

    return chain.data().map(e => this.unpack(e));
  }

  findAndRemove(filter: Filter) {
    const query = this.constructQuery(filter);
    this.eventsCollection.findAndRemove(query);
  }

  private constructQuery(filter: Filter): LokiQuery<PackedNostrEvent> {
    const query: LokiQuery<PackedNostrEvent> = {};

    if (filter.ids) {
      query.id = { $in: filter.ids.map(ID) };
    } else {
      if (filter.authors) {
        query.pubkey = { $in: filter.authors.map(ID) };
      }
      if (filter.kinds) {
        query.kind = { $in: filter.kinds };
      }
      if (filter["#e"]) {
        query.flatTags = { $contains: "e_" + filter["#e"]!.map(ID) };
      } else if (filter["#p"]) {
        query.flatTags = { $contains: "p_" + filter["#p"]!.map(ID) };
      } else if (filter["#d"]) {
        query.flatTags = { $contains: "d_" + filter["#d"]!.map(ID) };
      }
      if (filter.since && filter.until) {
        query.created_at = { $between: [filter.since, filter.until] };
      }
      if (filter.since) {
        query.created_at = { $gte: filter.since };
      }
      if (filter.until) {
        query.created_at = { $lte: filter.until };
      }
    }

    return query;
  }

  findOne(filter: Filter): TaggedNostrEvent | undefined {
    return this.findArray(filter)[0];
  }
}

export { InMemoryDB };

export default new InMemoryDB();
