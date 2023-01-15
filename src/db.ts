import Dexie, { Table } from 'dexie';

import type { User } from './nostr/types';

export class MySubClassedDexie extends Dexie {
  users!: Table<User>;

  constructor() {
    super('snortDB');
    this.version(1).stores({
      users: '++pubkey, name, display_name, about, nip05' // Primary key and indexed props
    });
  }
}

export const db = new MySubClassedDexie();
