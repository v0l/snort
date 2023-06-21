import { MetadataCache, RelayMetrics, UsersRelays } from ".";
import { NostrEvent } from "../Nostr";
import Dexie, { Table } from "dexie";

const NAME = "snort-system";
const VERSION = 2;

const STORES = {
    users: "++pubkey, name, display_name, picture, nip05, npub",
    relayMetrics: "++addr",
    userRelays: "++pubkey",
    events: "++id, pubkey, created_at"
};

export class SnortSystemDb extends Dexie {
    ready = false;
    users!: Table<MetadataCache>;
    relayMetrics!: Table<RelayMetrics>;
    userRelays!: Table<UsersRelays>;
    events!: Table<NostrEvent>;
    dms!: Table<NostrEvent>;

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