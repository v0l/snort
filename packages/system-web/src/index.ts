import { NostrEvent, CachedMetadata, RelayMetrics, UsersRelays, UsersFollows } from "@snort/system";
import Dexie, { Table } from "dexie";

const NAME = "snort-system";
const VERSION = 3;

const STORES = {
  users: "++pubkey, name, display_name, picture, nip05, npub",
  relayMetrics: "++addr",
  userRelays: "++pubkey",
  contacts: "++pubkey",
  events: "++id, pubkey, created_at",
};

export class SnortSystemDb extends Dexie {
  ready = false;
  users!: Table<CachedMetadata>;
  relayMetrics!: Table<RelayMetrics>;
  userRelays!: Table<UsersRelays>;
  events!: Table<NostrEvent>;
  contacts!: Table<UsersFollows>;

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
