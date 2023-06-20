import Dexie, { Table } from "dexie";
import { HexKey, NostrEvent, u256 } from "@snort/system";

export const NAME = "snortDB";
export const VERSION = 11;

export interface SubCache {
  id: string;
  ids: u256[];
  until?: number;
  since?: number;
}

export interface EventInteraction {
  id: u256;
  event: u256;
  by: HexKey;
  reacted: boolean;
  zapped: boolean;
  reposted: boolean;
}

export interface Payment {
  url: string;
  pr: string;
  preimage: string;
  macaroon: string;
}

const STORES = {
  chats: "++id",
  eventInteraction: "++id",
  payments: "++url",
};

export class SnortDB extends Dexie {
  ready = false;
  chats!: Table<NostrEvent>;
  eventInteraction!: Table<EventInteraction>;
  payments!: Table<Payment>;

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
