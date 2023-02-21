import Dexie, { Table } from "dexie";
import { u256 } from "@snort/nostr";
import { MetadataCache } from "State/Users";

export const NAME = "snortDB";
export const VERSION = 4;

export interface SubCache {
  id: string;
  ids: u256[];
  until?: number;
  since?: number;
}

const STORES = {
  users: "++pubkey, name, display_name, picture, nip05, npub",
};

export class SnortDB extends Dexie {
  users!: Table<MetadataCache>;

  constructor() {
    super(NAME);
    this.version(VERSION).stores(STORES);
  }
}

export const db = new SnortDB();
