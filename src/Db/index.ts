import Dexie, { Table } from "dexie";
import { MetadataCache } from "State/Users";
import { hexToBech32 } from "Util";

export const NAME = 'snortDB'
export const VERSION = 2

const STORES =  {
  users: '++pubkey, name, display_name, picture, nip05, npub'
}

export class SnortDB extends Dexie {
  users!: Table<MetadataCache>;

  constructor() {
    super(NAME);
    this.version(VERSION).stores(STORES).upgrade(tx => {
      return tx.table("users").toCollection().modify(user => {
        user.npub = hexToBech32("npub", user.pubkey)
      })
    });
  }
}

export const db = new SnortDB();
