import { NostrEvent, TaggedNostrEvent } from "@snort/system";
import Dexie, { Table } from "dexie";

export const NAME = "snortDB";
export const VERSION = 17;

export interface SubCache {
  id: string;
  ids: string[];
  until?: number;
  since?: number;
}

export interface Payment {
  url: string;
  pr: string;
  preimage: string;
  macaroon: string;
}

export interface UnwrappedGift {
  id: string;
  to: string;
  created_at: number;
  inner: NostrEvent;
  tags?: Array<Array<string>>; // some tags extracted
}

export type NostrEventForSession = TaggedNostrEvent & {
  forSession: string;
};

const STORES = {
  chats: "++id",
  eventInteraction: "++id",
  payments: "++url",
  gifts: "++id",
  notifications: "++id",
  followsFeed: "++id, created_at, kind",
  followLists: "++pubkey",
};

export class SnortDB extends Dexie {
  ready = false;
  chats!: Table<NostrEvent>;
  payments!: Table<Payment>;
  gifts!: Table<UnwrappedGift>;
  notifications!: Table<NostrEventForSession>;
  followsFeed!: Table<TaggedNostrEvent>;
  followLists!: Table<TaggedNostrEvent>;

  constructor() {
    super(NAME);
    this.version(VERSION).stores(STORES);
  }

  isAvailable() {
    if ("indexedDB" in window) {
      return new Promise<boolean>(resolve => {
        const req = window.indexedDB.open("dummy", 1);
        req.onsuccess = () => {
          resolve(true);
        };
        req.onerror = () => {
          resolve(false);
        };
      });
    }
    return Promise.resolve(false);
  }
}

export const db = new SnortDB();
