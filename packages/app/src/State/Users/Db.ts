import { HexKey } from "@snort/nostr";
import { db as idb } from "Db";

import { UsersDb, MetadataCache, setUsers } from "State/Users";
import store from "State/Store";
import { groupByPubkey, unixNowMs, unwrap } from "Util";

class IndexedUsersDb implements UsersDb {
  ready = false;

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

  find(key: HexKey) {
    return idb.users.get(key);
  }

  query(q: string) {
    return idb.users
      .where("npub")
      .startsWithIgnoreCase(q)
      .or("name")
      .startsWithIgnoreCase(q)
      .or("display_name")
      .startsWithIgnoreCase(q)
      .or("nip05")
      .startsWithIgnoreCase(q)
      .limit(5)
      .toArray();
  }

  async bulkGet(keys: HexKey[]) {
    const ret = await idb.users.bulkGet(keys);
    return ret.filter(a => a !== undefined).map(a_1 => unwrap(a_1));
  }

  async add(user: MetadataCache) {
    await idb.users.add(user);
  }

  async put(user: MetadataCache) {
    await idb.users.put(user);
  }

  async bulkAdd(users: MetadataCache[]) {
    await idb.users.bulkAdd(users);
  }

  async bulkPut(users: MetadataCache[]) {
    await idb.users.bulkPut(users);
  }

  async update(key: HexKey, fields: Record<string, string | number>) {
    await idb.users.update(key, fields);
  }
}

export const IndexedUDB = new IndexedUsersDb();

class ReduxUsersDb implements UsersDb {
  async isAvailable() {
    return true;
  }

  async query(q: string) {
    const state = store.getState();
    const { users } = state.users;
    return Object.values(users).filter(user => {
      const profile = user as MetadataCache;
      return (
        profile.name?.includes(q) ||
        profile.npub?.includes(q) ||
        profile.display_name?.includes(q) ||
        profile.nip05?.includes(q)
      );
    });
  }

  querySync(q: string) {
    const state = store.getState();
    const { users } = state.users;
    return Object.values(users).filter(user => {
      const profile = user as MetadataCache;
      return (
        profile.name?.includes(q) ||
        profile.npub?.includes(q) ||
        profile.display_name?.includes(q) ||
        profile.nip05?.includes(q)
      );
    });
  }

  async find(key: HexKey) {
    const state = store.getState();
    const { users } = state.users;
    let ret: MetadataCache | undefined = users[key];
    if (IndexedUDB.ready && ret === undefined) {
      ret = await IndexedUDB.find(key);
      if (ret) {
        await this.put(ret);
      }
    }
    return ret;
  }

  async add(user: MetadataCache) {
    const state = store.getState();
    const { users } = state.users;
    store.dispatch(setUsers({ ...users, [user.pubkey]: user }));
    if (IndexedUDB.ready) {
      await IndexedUDB.add(user);
    }
  }

  async put(user: MetadataCache) {
    const state = store.getState();
    const { users } = state.users;
    store.dispatch(setUsers({ ...users, [user.pubkey]: user }));
    if (IndexedUDB.ready) {
      await IndexedUDB.put(user);
    }
  }

  async bulkAdd(newUserProfiles: MetadataCache[]) {
    const state = store.getState();
    const { users } = state.users;
    const newUsers = newUserProfiles.reduce(groupByPubkey, {});
    store.dispatch(setUsers({ ...users, ...newUsers }));
    if (IndexedUDB.ready) {
      await IndexedUDB.bulkAdd(newUserProfiles);
    }
  }

  async bulkGet(keys: HexKey[]) {
    const state = store.getState();
    const { users } = state.users;
    const ids = new Set([...keys]);
    let ret = Object.values(users).filter(user => {
      return ids.has(user.pubkey);
    });
    if (IndexedUDB.ready && ret.length !== ids.size) {
      const startLoad = unixNowMs();
      const hasKeys = new Set(Object.keys(users));
      const missing = [...ids].filter(a => !hasKeys.has(a));
      const missingFromCache = await IndexedUDB.bulkGet(missing);
      store.dispatch(setUsers({ ...users, ...missingFromCache.reduce(groupByPubkey, {}) }));
      console.debug(
        `Loaded ${missingFromCache.length}/${missing.length} profiles from cache in ${(unixNowMs() - startLoad).toFixed(
          1
        )} ms`
      );
      ret = [...ret, ...missingFromCache];
    }
    return ret;
  }

  async update(key: HexKey, fields: Record<string, string | number>) {
    const state = store.getState();
    const { users } = state.users;
    const current = users[key];
    const updated = { ...current, ...fields };
    store.dispatch(setUsers({ ...users, [key]: updated }));
    if (IndexedUDB.ready) {
      await IndexedUDB.update(key, fields);
    }
  }

  async bulkPut(newUsers: MetadataCache[]) {
    const state = store.getState();
    const { users } = state.users;
    const newProfiles = newUsers.reduce(groupByPubkey, {});
    store.dispatch(setUsers({ ...users, ...newProfiles }));
    if (IndexedUDB.ready) {
      await IndexedUDB.bulkPut(newUsers);
    }
  }
}

export const ReduxUDB = new ReduxUsersDb();
