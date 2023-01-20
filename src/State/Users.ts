import { useMemo } from "react";
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { useLiveQuery } from "dexie-react-hooks";
import { HexKey, TaggedRawEvent, UserMetadata } from "Nostr";
import { hexToBech32 } from "../Util";
import { db } from "Db";
import store from "State/Store";

export interface MetadataCache extends UserMetadata {
    /**
     * When the object was saved in cache
     */
    loaded: number,

    /**
     * When the source metadata event was created
     */
    created: number,

    /**
     * The pubkey of the owner of this metadata
     */
    pubkey: HexKey

    /**
     * The bech32 encoded pubkey
     */
    npub: string
};

export function mapEventToProfile(ev: TaggedRawEvent) {
    try {
        let data: UserMetadata = JSON.parse(ev.content);
        return {
            pubkey: ev.pubkey,
            npub: hexToBech32("npub", ev.pubkey),
            created: ev.created_at,
            loaded: new Date().getTime(),
            ...data
        } as MetadataCache;
    } catch (e) {
      console.error("Failed to parse JSON", ev, e);
    }
}

export interface UsersStore {
    /**
     * A list of seen users
     */
    users: Record<HexKey, MetadataCache>,
};

const InitState = { users: {} } as UsersStore;

const UsersSlice = createSlice({
    name: "Users",
    initialState: InitState,
    reducers: {
        setUsers(state, action: PayloadAction<Record<HexKey, MetadataCache>>) {
          state.users = action.payload
        }
    }
});

const { setUsers } = UsersSlice.actions

function groupByPubkey(acc: Record<HexKey, MetadataCache>, user: MetadataCache) {
  return { ...acc, [user.pubkey]: user }
}

function groupByPubkeyMap(acc: Map<HexKey, MetadataCache>, user: MetadataCache) {
  acc.set(user.pubkey, user)
  return acc
}

export const add = async (user: MetadataCache) => {
  try {
    return await db.users.add(user)
  } catch (error) {
    const state = store.getState()
    const { users } = state.users
    store.dispatch(setUsers({...users, [user.pubkey]: user }))
  }
}

export const bulkAdd = async (newUserProfiles: MetadataCache[]) => {
  try {
    return await db.users.bulkAdd(newUserProfiles)
  } catch (error) {
    const state = store.getState()
    const { users } = state.users
    const newUsers = newUserProfiles.reduce(groupByPubkey, {})
    store.dispatch(setUsers({...users, ...newUsers }))
  }
}

export const bulkGet = async (pubKeys: HexKey[]) => {
  try {
    const ret = await db.users.bulkGet(pubKeys);
    return ret.filter(a => a !== undefined).map(a => a!);
  } catch (error) {
    const state = store.getState()
    const { users } = state.users
    const ids = new Set([...pubKeys])
    return Object.values(users).filter(user => {
      return ids.has(user.pubkey)
    })
  }
}

export const find = async (pubKey: HexKey) => {
  try {
    const user = await db.users.get(pubKey);
    return user
  } catch (error) {
    const { users } = store.getState()
    return users.users[pubKey]
  }
}

export const put = async (user: MetadataCache) => {
  try {
    await db.users.put(user)
  } catch (error) {
    const state = store.getState()
    const { users } = state.users
    store.dispatch(setUsers({...users, [user.pubkey]: user }))
  }
}

export const update = async (pubKey: HexKey, fields: Record<string, any>) => {
  try {
    await db.users.update(pubKey, fields)
  } catch (error) {
    const state = store.getState()
    const { users } = state.users
    const current = users[pubKey]
    store.dispatch(setUsers({...users, [pubKey]: {...current, ...fields }}))
  }
}

export const bulkPut = async (newUsers: MetadataCache[]) => {
  try {
    await db.users.bulkPut(newUsers)
  } catch (error) {
    const state = store.getState()
    const { users } = state.users
    const newProfiles = newUsers.reduce(groupByPubkey, {})
    store.dispatch(setUsers({ ...users, ...newProfiles }))
  }
}

export function useQuery(query: string, limit: number = 5) {
  const state = store.getState()
  const { users } = state.users

  const inMemoryUsers = useMemo(() => {
    return Object.values(users).filter((user) => {
      return user.name?.includes(query)
        || user.npub?.includes(query)
        || user.display_name?.includes(query)
        || user.nip05?.includes(query)
    })
  }, [users, query])

  const allUsers = useLiveQuery(
    () => db.users
          .where("npub").startsWithIgnoreCase(query)
          .or("name").startsWithIgnoreCase(query)
          .or("display_name").startsWithIgnoreCase(query)
          .or("nip05").startsWithIgnoreCase(query)
          .limit(5)
          .toArray()
          .catch((err) => {
            return inMemoryUsers
          }),
    [query],
  )

  return allUsers
}

export function useKey(pubKey: HexKey) {
  const state = store.getState()
  const { users } = state.users

  const inMemoryUser = useMemo(() => {
    return users[pubKey]
  }, [users, pubKey])

  const user = useLiveQuery(async () => {
      if (pubKey) {
          return await find(pubKey);
      }
  }, [pubKey]);

  return user ?? inMemoryUser
}

export function useKeys(pubKeys: HexKey[]): Map<HexKey, MetadataCache> {
  const state = store.getState()
  const { users } = state.users

  const inMemoryUsers = useMemo(() => {
    const res = new Map()
    Object.values(users).forEach(u => {
      if (pubKeys.includes(u.pubkey)) {
        res.set(u.pubkey, u)
      }
    })
    return res
  }, [users, pubKeys])

  const dbUsers = useLiveQuery(async () => {
      if (pubKeys) {
        const ret = await bulkGet(pubKeys);
        return new Map(ret.map(a => [a.pubkey, a]))
      }
      return new Map()
  }, [pubKeys]);

  return dbUsers || inMemoryUsers
}

export const reducer = UsersSlice.reducer;
