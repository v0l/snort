import LRUSet from "@snort/shared/src/LRUSet";
import { ReqFilter as Filter, TaggedNostrEvent } from "@snort/system";
import * as Comlink from "comlink";
import Dexie, { Table } from "dexie";

type Tag = {
  id: string;
  eventId: string;
  type: string;
  value: string;
};

type SaveQueueEntry = { event: TaggedNostrEvent; tags: Tag[] };
type Task = () => Promise<void>;

class IndexedDB extends Dexie {
  events!: Table<TaggedNostrEvent>;
  tags!: Table<Tag>;
  private saveQueue: SaveQueueEntry[] = [];
  private subscribedEventIds = new Set<string>();
  private subscribedAuthors = new Set<string>();
  private subscribedTags = new Set<string>();
  private subscribedAuthorsAndKinds = new Set<string>();
  private readQueue: Map<string, Task> = new Map();
  private isProcessingQueue = false;
  private seenEvents = new LRUSet(2000);

  constructor() {
    super("EventDB");

    this.version(6).stores({
      // TODO use multientry index for *tags
      events: "++id, pubkey, kind, created_at, [pubkey+kind]",
      tags: "&[type+value+eventId], [type+value], eventId",
    });

    this.startInterval();
  }

  private startInterval() {
    const processQueue = async () => {
      if (this.saveQueue.length > 0) {
        try {
          const eventsToSave: TaggedNostrEvent[] = [];
          const tagsToSave: Tag[] = [];
          for (const item of this.saveQueue) {
            eventsToSave.push(item.event);
            tagsToSave.push(...item.tags);
          }
          await this.events.bulkPut(eventsToSave);
          await this.tags.bulkPut(tagsToSave);
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

  handleEvent(event: TaggedNostrEvent) {
    if (this.seenEvents.has(event.id)) {
      return;
    }
    this.seenEvents.add(event.id);

    // maybe we don't want event.kind 3 tags
    const tags =
      event.kind === 3
        ? []
        : event.tags
            ?.filter(tag => {
              if (tag[0] === "d") {
                return true;
              }
              if (tag[0] === "e") {
                return true;
              }
              // we're only interested in p tags where we are mentioned
              /*
              if (tag[0] === "p") {
                Key.isMine(tag[1])) { // TODO
                return true;
              }*/
              return false;
            })
            .map(tag => ({
              eventId: event.id,
              type: tag[0],
              value: tag[1],
            })) || [];

    this.saveQueue.push({ event, tags });
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
        .each(callback);
    });
  };

  getByEventIds = async (callback: (event: TaggedNostrEvent) => void) => {
    this.enqueueRead("getByEventIds", async () => {
      const ids = [...this.subscribedEventIds];
      this.subscribedEventIds.clear();
      await this.events.where("id").anyOf(ids).each(callback);
    });
  };

  getByTags = async (callback: (event: TaggedNostrEvent) => void) => {
    this.enqueueRead("getByTags", async () => {
      const tagPairs = [...this.subscribedTags].map(tag => tag.split("|"));
      this.subscribedTags.clear();

      await this.tags
        .where("[type+value]")
        .anyOf(tagPairs)
        .each(tag => this.subscribedEventIds.add(tag.eventId));

      await this.getByEventIds(callback);
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
            this.subscribedTags.add(tagName + "|" + value);
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
