import Dexie, { Table } from "dexie";
import { MetadataCache } from "./User";
import { hexToBech32 } from "../Util";


export class SnortDB extends Dexie {
  users!: Table<MetadataCache>;

  constructor() {
    super('snortDB');
    this.version(2).stores({
      users: '++pubkey, name, display_name, picture, nip05, npub'
    }).upgrade(tx => {
      return tx.table("users").toCollection().modify(user => {
        user.npub = hexToBech32("npub", user.pubkey)
      })
    });
  }
}

export const db = new SnortDB();
