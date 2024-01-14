import LRUSet from "@snort/shared/src/LRUSet";
import { ReqFilter as Filter, TaggedNostrEvent } from "@snort/system";
import * as Comlink from "comlink";
import Dexie, { Table } from "dexie";

type PackedNostrEvent = {
  id: string;
  pubkey: string;
  kind: number;
  tags: Array<Array<string>>;
  flatTags: string[];
  sig: string;
  created_at: number;
  content: string;
  relays: string[];
};

type Task = () => Promise<void>;

class IndexedDB extends Dexie {
  events!: Table<PackedNostrEvent>;
  private saveQueue: PackedNostrEvent[] = [];
  private subscribedEventIds = new Set<string>();
  private subscribedAuthors = new Set<string>();
  private subscribedTags = new Set<string>();
  private subscribedAuthorsAndKinds = new Set<string>();
  private readQueue: Map<string, Task> = new Map();
  private isProcessingQueue = false;
  private seenEvents = new LRUSet(2000);

  constructor() {
    super("EventDB");

    this.version(7).stores({
      events: "++id, pubkey, kind, created_at, [pubkey+kind], *flatTags",
    });

    this.startInterval();
  }

  async getForYouFeed(pubkey: string): Promise<TaggedNostrEvent[]> {
    // get ids of events where pubkey is pubkey and kind is 7
    const myReactedEvents = new Set<string>();
    await this.events
      .where("pubkey")
      .equals(pubkey)
      .each(e => {
        e.tags.forEach(tag => {
          if (tag[0] === "e") {
            myReactedEvents.add(tag[1]);
          }
        });
      });
    console.log("myReactedEvents", myReactedEvents);
    const othersWhoReacted = new Set<string>();
    for (const id of myReactedEvents) {
      await this.events
        .where("flatTags")
        .equals("e_" + id)
        .each(e => {
          if (e.pubkey !== pubkey) {
            othersWhoReacted.add(e.pubkey);
          }
        });
    }
    console.log("othersWhoReacted.length", othersWhoReacted.size);
    const reactedByOthers = new Set<string>();
    for (const pubkey of othersWhoReacted) {
      await this.events
        .where("pubkey")
        .equals(pubkey)
        .each(e => {
          e.tags.forEach(tag => {
            if (tag[0] === "e") {
              reactedByOthers.add(tag[1]);
            }
          });
        });
    }
    const ids = [...reactedByOthers].filter(id => !myReactedEvents.has(id));
    const events: TaggedNostrEvent[] = [];
    for (const id of ids) {
      await this.events
        .where("id")
        .equals(id)
        .each(e => {
          if (e.tags.some(t => t[0] === "e")) {
            return; // no replies
          }
          events.push(this.unpack(e));
          this.seenEvents.add(e.id);
        });
    }

    return events.sort((a, b) => b.created_at - a.created_at);
  }

  private startInterval() {
    const processQueue = async () => {
      if (this.saveQueue.length > 0) {
        try {
          const eventsToSave: PackedNostrEvent[] = [];
          for (const event of this.saveQueue) {
            eventsToSave.push(event);
          }
          await this.events.bulkPut(eventsToSave);
        } catch (e) {
          console.error(e);
        } finally {
          this.saveQueue = [];
        }
      }
      setTimeout(() => processQueue(), 3000);
    };

    setTimeout(() => processQueue(), 3000);
  }

  pack(event: TaggedNostrEvent): PackedNostrEvent {
    const flatTags =
      event.kind === 3
        ? []
        : event.tags.filter(tag => ["e", "p", "d"].includes(tag[0])).map(tag => `${tag[0]}_${tag[1]}`);
    return {
      id: event.id,
      pubkey: event.pubkey,
      kind: event.kind,
      tags: event.tags,
      flatTags,
      sig: event.sig,
      created_at: event.created_at,
      content: event.content,
      relays: event.relays,
    };
  }

  unpack(event: PackedNostrEvent): TaggedNostrEvent {
    return {
      id: event.id,
      pubkey: event.pubkey,
      kind: event.kind,
      tags: event.tags,
      sig: event.sig,
      created_at: event.created_at,
      content: event.content,
      relays: event.relays,
    };
  }

  handleEvent(event: TaggedNostrEvent) {
    if (this.seenEvents.has(event.id)) {
      return;
    }
    this.seenEvents.add(event.id);

    const packedEvent = this.pack(event);

    this.saveQueue.push(packedEvent);
  }

  private async startReadQueue() {
    if (!this.isProcessingQueue && this.readQueue.size > 0) {
      this.isProcessingQueue = true;
      for (const [key, task] of this.readQueue.entries()) {
        this.readQueue.delete(key); // allow to re-queue right away
        console.log("starting idb task", key);
        console.time(key);
        await task();
        console.timeEnd(key);
      }
      this.isProcessingQueue = false;
    }
  }

  private enqueueRead(key: string, task: () => Promise<void>) {
    this.readQueue.set(key, task);
    this.startReadQueue();
  }

  getByAuthors = async (callback: (event: TaggedNostrEvent) => void, limit?: number) => {
    this.enqueueRead("getByAuthors", async () => {
      const authors = [...this.subscribedAuthors];
      this.subscribedAuthors.clear();

      await this.events
        .where("pubkey")
        .anyOf(authors)
        .limit(limit || 1000)
        .each(e => callback(this.unpack(e)));
    });
  };

  getByEventIds = async (callback: (event: TaggedNostrEvent) => void) => {
    this.enqueueRead("getByEventIds", async () => {
      const ids = [...this.subscribedEventIds];
      this.subscribedEventIds.clear();
      await this.events
        .where("id")
        .anyOf(ids)
        .each(e => callback(this.unpack(e)));
    });
  };

  getByTags = async (callback: (event: TaggedNostrEvent) => void) => {
    this.enqueueRead("getByTags", async () => {
      const tags = [...this.subscribedTags];
      this.subscribedTags.clear();
      const flatTags = tags.map(tag => {
        const [type, value] = tag.split("_");
        return [type, value];
      });
      await this.events
        .where("flatTags")
        .anyOf(flatTags)
        .each(e => callback(this.unpack(e)));
    });
  };

  getByAuthorsAndKinds = async (callback: (event: TaggedNostrEvent) => void) => {
    this.enqueueRead("authorsAndKinds", async () => {
      const authorsAndKinds = [...this.subscribedAuthorsAndKinds];
      this.subscribedAuthorsAndKinds.clear();
      const pairs = authorsAndKinds.map(pair => {
        const [author, kind] = pair.split("|");
        return [author, parseInt(kind)];
      });
      await this.events.where("[pubkey+kind]").anyOf(pairs).each(callback);
    });
  };

  async find(filter: Filter, callback: (event: TaggedNostrEvent) => void): Promise<void> {
    if (!filter) return;

    const filterString = JSON.stringify(filter);
    if (this.readQueue.has(filterString)) {
      return;
    }

    // make sure only 1 argument is passed
    const cb = e => {
      this.seenEvents.add(e.id);
      if (filter.not?.ids?.includes(e.id)) {
        console.log("skipping", e.id);
        return;
      }
      callback(e);
    };

    let hasTags = false;
    for (const key in filter) {
      if (key.startsWith("#")) {
        hasTags = true;
        const tagName = key.slice(1); // Remove the hash to get the tag name
        const values = filter[key];
        if (Array.isArray(values)) {
          for (const value of values) {
            this.subscribedTags.add(`${tagName}_${value}`);
          }
        }
      }
    }

    if (hasTags) {
      await this.getByTags(cb);
      return;
    }

    if (filter.ids?.length) {
      filter.ids.forEach(id => this.subscribedEventIds.add(id));
      await this.getByEventIds(cb);
      return;
    }

    if (filter.authors?.length && filter.kinds?.length) {
      const permutations = filter.authors.flatMap(author => filter.kinds!.map(kind => author + "|" + kind));
      permutations.forEach(permutation => this.subscribedAuthorsAndKinds.add(permutation));
      await this.getByAuthorsAndKinds(cb);
      return;
    }

    if (filter.authors?.length) {
      filter.authors.forEach(author => this.subscribedAuthors.add(author));
      await this.getByAuthors(cb);
      return;
    }

    let query = this.events;
    if (filter.kinds) {
      query = query.where("kind").anyOf(filter.kinds);
    }
    if (filter.search) {
      const term = filter.search.replace(" sort:popular", "");
      if (term === "") {
        return;
      }
      const regexp = new RegExp(term, "i");
      query = query.filter((event: Event) => event.content?.match(regexp));
    }
    if (filter.limit) {
      query = query.limit(filter.limit);
    }
    // TODO test that the sort is actually working
    this.enqueueRead(filterString, async () => {
      await query.each(cb);
    });
  }
}

const db = new IndexedDB();

Comlink.expose(db);
