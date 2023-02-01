import { HexKey } from "Nostr";
import { db as idb } from "Db";

import { UsersDb, MetadataCache, setUsers } from "State/Users";
import store from "State/Store";

class IndexedDb implements UsersDb {
  ready: boolean = false;

  isAvailable() {
    if ("indexedDB" in window) {
      return new Promise<boolean>((resolve) => {
        const req = window.indexedDB.open("dummy", 1)
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

class ReduxUsersDb implements UsersDb {
  async isAvailable() { return true }

  async query(q: string) {
    const state = store.getState()
    const { users } = state.users
    return Object.values(users).filter(user => {
      const profile = user as MetadataCache
      return profile.name?.includes(q)
        || profile.npub?.includes(q)
        || profile.display_name?.includes(q)
        || profile.nip05?.includes(q)
    })
  }

  async find(key: HexKey) {
    const state = store.getState()
    const { users } = state.users
    return users[key]
  }


  async add(user: MetadataCache) {
    const state = store.getState()
    const { users } = state.users
    store.dispatch(setUsers({ ...users, [user.pubkey]: user }))
  }


  async put(user: MetadataCache) {
    const state = store.getState()
    const { users } = state.users
    store.dispatch(setUsers({ ...users, [user.pubkey]: user }))
  }

  async bulkAdd(newUserProfiles: MetadataCache[]) {
    const state = store.getState()
    const { users } = state.users
    const newUsers = newUserProfiles.reduce(groupByPubkey, {})
    store.dispatch(setUsers({ ...users, ...newUsers }))
  }

  async bulkGet(keys: HexKey[]) {
    const state = store.getState()
    const { users } = state.users
    const ids = new Set([...keys])
    return Object.values(users).filter(user => {
      return ids.has(user.pubkey)
    })
  }

  async update(key: HexKey, fields: Record<string, any>) {
    const state = store.getState()
    const { users } = state.users
    const current = users[key]
    const updated = { ...current, ...fields }
    store.dispatch(setUsers({ ...users, [key]: updated }))
  }

  async bulkPut(newUsers: MetadataCache[]) {
    const state = store.getState()
    const { users } = state.users
    const newProfiles = newUsers.reduce(groupByPubkey, {})
    store.dispatch(setUsers({ ...users, ...newProfiles }))
  }
}


const indexedDb = new IndexedDb()
export const inMemoryDb = new ReduxUsersDb()

let db: UsersDb = inMemoryDb
indexedDb.isAvailable().then((available) => {
  if (available) {
    console.debug('Using Indexed DB')
    indexedDb.ready = true;
    db = indexedDb;
  } else {
    console.debug('Using in-memory DB')
  }
})

export function getDb() {
  return db
}
