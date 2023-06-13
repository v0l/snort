import Dexie, { Table } from "dexie";
import { FullRelaySettings, HexKey, NostrEvent, u256, MetadataCache } from "@snort/system";

export const NAME = "snortDB";
export const VERSION = 9;

export interface SubCache {
  id: string;
  ids: u256[];
  until?: number;
  since?: number;
}

export interface RelayMetrics {
  addr: string;
  events: number;
  disconnects: number;
  latency: number[];
}

export interface UsersRelays {
  pubkey: HexKey;
  created_at: number;
  relays: FullRelaySettings[];
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
  users: "++pubkey, name, display_name, picture, nip05, npub",
  relays: "++addr",
  userRelays: "++pubkey",
  events: "++id, pubkey, created_at",
  dms: "++id, pubkey",
  eventInteraction: "++id",
  payments: "++url",
};

export class SnortDB extends Dexie {
  ready = false;
  users!: Table<MetadataCache>;
  relayMetrics!: Table<RelayMetrics>;
  userRelays!: Table<UsersRelays>;
  events!: Table<NostrEvent>;
  dms!: Table<NostrEvent>;
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
