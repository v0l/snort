import { HexKey } from "Nostr";
import { db as idb, NAME, VERSION } from "Db";

import { UsersDb, MetadataCache } from "State/Users";

class IndexedDb implements UsersDb {
  isAvailable() {
    if ("indexedDB" in window) {
      return new Promise<boolean>((resolve) => {
        const req = window.indexedDB.open(NAME, VERSION)
        req.onsuccess = (ev) => {
          resolve(true)
        }
        req.onerror = (ev) => {
          resolve(false)
        }
      })
    }
    return Promise.resolve(false)
  }

  find(key: HexKey) {
    return idb.users.get(key);
  }

  query(q: string) {
    return idb.users
            .where("npub").startsWithIgnoreCase(q)
            .or("name").startsWithIgnoreCase(q)
            .or("display_name").startsWithIgnoreCase(q)
            .or("nip05").startsWithIgnoreCase(q)
            .limit(5)
            .toArray()
  }

  bulkGet(keys: HexKey[]) {
    return idb.users.bulkGet(keys).then(ret => ret.filter(a => a !== undefined).map(a => a!));
  }

  add(user: MetadataCache) {
    return idb.users.add(user)
  }
  
  put(user: MetadataCache) {
    return idb.users.put(user)
  }

  bulkAdd(users: MetadataCache[]) {
    return idb.users.bulkAdd(users)
  }

  bulkPut(users: MetadataCache[]) {
    return idb.users.bulkPut(users)
  }

  update(key: HexKey, fields: Record<string, any>) {
    return idb.users.update(key, fields)
  }
}

function groupByPubkey(acc: Record<HexKey, MetadataCache>, user: MetadataCache) {
  return { ...acc, [user.pubkey]: user }
}

class InMemoryDb implements UsersDb {
  users: Map<HexKey, MetadataCache>

  constructor() {
    this.users = {} as Map<HexKey, MetadataCache>
  }

  async isAvailable() { return true }

  async query(q: string) {
    return Object.values(this.users).filter(user => {
      const profile = user as MetadataCache
      return profile.name?.includes(q)
        || profile.npub?.includes(q)
        || profile.display_name?.includes(q)
        || profile.nip05?.includes(q)
    })
  }

  async find(key: HexKey) {
    // @ts-ignore
    return this.users[key]
  }


  async add(user: MetadataCache) {
    this.users = {...this.users, [user.pubkey]: user }
  }


  async put(user: MetadataCache) {
    this.users = {...this.users, [user.pubkey]: user }
  }

  async bulkAdd(newUserProfiles: MetadataCache[]) {
    const newUsers = newUserProfiles.reduce(groupByPubkey, {})
    this.users = {...this.users, ...newUsers }
  }

  async bulkGet(keys: HexKey[]) {
    const ids = new Set([...keys])
    return Object.values(this.users).filter(user => {
      return ids.has(user.pubkey)
    })
  }

  async update(key: HexKey, fields: Record<string, any>) {
    const current = await this.find(key)
    const updated = {...current, ...fields }
    this.users = {...this.users, [key]: updated }
  }

  async bulkPut(newUsers: MetadataCache[]) {
    const newProfiles = newUsers.reduce(groupByPubkey, {})
    this.users = { ...this.users, ...newProfiles }
  }
}


const indexedDb = new IndexedDb()
export const inMemoryDb = new InMemoryDb()

let db: UsersDb = inMemoryDb
indexedDb.isAvailable().then((available) => {
  if (available) {
    console.debug('Using Indexed DB')
    db = indexedDb;
  } else {
    console.debug('Using in-memory DB')
  }
})

export default db
