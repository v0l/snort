import Dexie, { Table } from "dexie";
import { TaggedRawEvent, u256 } from "Nostr";
import { MetadataCache } from "State/Users";
import { hexToBech32 } from "Util";

export const NAME = "snortDB";
export const VERSION = 3;

export interface SubCache {
  id: string;
  ids: u256[];
  until?: number;
  since?: number;
}

const STORES = {
  users: "++pubkey, name, display_name, picture, nip05, npub",
  events: "++id, pubkey, created_at",
  feeds: "++id",
};

export class SnortDB extends Dexie {
  users!: Table<MetadataCache>;
  events!: Table<TaggedRawEvent>;
  feeds!: Table<SubCache>;

  constructor() {
    super(NAME);
    this.version(VERSION)
      .stores(STORES)
      .upgrade(async (tx) => {
        await tx
          .table("users")
          .toCollection()
          .modify((user) => {
            user.npub = hexToBech32("npub", user.pubkey);
          });
      });
  }
}

export const db = new SnortDB();
