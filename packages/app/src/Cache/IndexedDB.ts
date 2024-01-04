import Dexie, { Table } from "dexie";
import { TaggedNostrEvent, ReqFilter as Filter } from "@snort/system";
import * as Comlink from "comlink";
import { seenEvents } from "@snort/system";

type Tag = {
  id: string;
  eventId: string;
  type: string;
  value: string;
};

type SaveQueueEntry = { event: TaggedNostrEvent; tags: Tag[] };

class IndexedDB extends Dexie {
  events!: Table<TaggedNostrEvent>;
  tags!: Table<Tag>;
  private saveQueue: SaveQueueEntry[] = [];
  private subscribedEventIds = new Set<string>();
  private subscribedAuthors = new Set<string>();
  private subscribedTags = new Set<string>();
  private subscribedAuthorsAndKinds = new Set<string>();

  constructor() {
    super("EventDB");

    this.version(5).stores({
      events: "id, pubkey, kind, created_at, [pubkey+kind]",
      tags: "id, eventId, [type+value]",
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
    if (seenEvents.has(event.id)) {
      return;
    }
    seenEvents.add(event.id);

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
              id: event.id.slice(0, 16) + "-" + tag[0].slice(0, 16) + "-" + tag[1].slice(0, 16),
              eventId: event.id,
              type: tag[0],
              value: tag[1],
            })) || [];

    this.saveQueue.push({ event, tags });
  }

  _throttle(func, limit) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
          func.apply(this, args);
        }, limit);
      }
    };
  }

  subscribeToAuthors = this._throttle(async function (callback: (event: TaggedNostrEvent) => void, limit?: number) {
    const authors = [...this.subscribedAuthors];
    this.subscribedAuthors.clear();
    await this.events
      .where("pubkey")
      .anyOf(authors)
      .limit(limit || 1000)
      .each(callback);
  }, 200);

  subscribeToEventIds = this._throttle(async function (callback: (event: TaggedNostrEvent) => void) {
    const ids = [...this.subscribedEventIds];
    this.subscribedEventIds.clear();
    await this.events.where("id").anyOf(ids).each(callback);
  }, 200);

  subscribeToTags = this._throttle(async function (callback: (event: TaggedNostrEvent) => void) {
    const tagPairs = [...this.subscribedTags].map(tag => tag.split("|"));
    this.subscribedTags.clear();
    await this.tags
      .where("[type+value]")
      .anyOf(tagPairs)
      .each(tag => this.subscribedEventIds.add(tag.eventId));

    await this.subscribeToEventIds(callback);
  }, 200);

  subscribeToAuthorsAndKinds = this._throttle(async function (callback: (event: TaggedNostrEvent) => void) {
    const authorsAndKinds = [...this.subscribedAuthorsAndKinds];
    this.subscribedAuthorsAndKinds.clear();
    // parse pair[1] as int
    const pairs = authorsAndKinds.map(pair => {
      const [author, kind] = pair.split("|");
      return [author, parseInt(kind)];
    });
    await this.events.where("[pubkey+kind]").anyOf(pairs).each(callback);
  }, 200);

  async find(filter: Filter, callback: (event: TaggedNostrEvent) => void): Promise<void> {
    if (!filter) return;

    // make sure only 1 argument is passed
    const cb = e => {
      seenEvents.add(e.id);
      callback(e);
    };

    if (filter["#p"] && Array.isArray(filter["#p"])) {
      for (const eventId of filter["#p"]) {
        this.subscribedTags.add("p|" + eventId);
      }

      await this.subscribeToTags(cb);
      return;
    }

    if (filter["#e"] && Array.isArray(filter["#e"])) {
      for (const eventId of filter["#e"]) {
        this.subscribedTags.add("e|" + eventId);
      }

      await this.subscribeToTags(cb);
      return;
    }

    if (filter["#d"] && Array.isArray(filter["#d"])) {
      for (const eventId of filter["#d"]) {
        this.subscribedTags.add("d|" + eventId);
      }

      await this.subscribeToTags(cb);
      return;
    }

    if (filter.ids?.length) {
      filter.ids.forEach(id => this.subscribedEventIds.add(id));
      await this.subscribeToEventIds(cb);
      return;
    }

    if (filter.authors?.length && filter.kinds?.length) {
      const permutations = filter.authors.flatMap(author => filter.kinds!.map(kind => author + "|" + kind));
      permutations.forEach(permutation => this.subscribedAuthorsAndKinds.add(permutation));
      await this.subscribeToAuthorsAndKinds(cb);
      return;
    }

    if (filter.authors?.length) {
      filter.authors.forEach(author => this.subscribedAuthors.add(author));
      await this.subscribeToAuthors(cb);
      return;
    }

    let query = this.events;
    if (filter.kinds) {
      query = query.where("kind").anyOf(filter.kinds);
    }
    if (filter.search) {
      const regexp = new RegExp(filter.search, "i");
      query = query.filter((event: Event) => event.content?.match(regexp));
    }
    if (filter.limit) {
      query = query.limit(filter.limit);
    }
    // TODO test that the sort is actually working
    await query.each(e => {
      cb(e);
    });
  }
}

const db = new IndexedDB();

Comlink.expose(db);
