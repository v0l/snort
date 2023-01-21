import { useMemo } from "react";
import { useSelector } from "react-redux";
import { useLiveQuery } from "dexie-react-hooks";

import { RootState } from "State/Store";
import { MetadataCache } from "State/Users";
import { HexKey } from "Nostr";
import { db } from "Db";

export function useQuery(query: string, limit: number = 5) {
  const { users } = useSelector((state: RootState) => state.users)

  const inMemoryUsers = useMemo(() => {
    return Object.values(users).filter(user => {
      const profile = user as MetadataCache
      return profile.name?.includes(query)
        || profile.npub?.includes(query)
        || profile.display_name?.includes(query)
        || profile.nip05?.includes(query)
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
    [query, inMemoryUsers],
  )

  return allUsers
}

export function useKey(pubKey: HexKey) {
  const { users } = useSelector((s: RootState) => s.users)

  const inMemoryUser = useMemo(() => {
    return users[pubKey]
  }, [users, pubKey])

  const user = useLiveQuery(async () => {
      if (pubKey) {
        try {
          return await db.users.get(pubKey);
        } catch (error) {
          return inMemoryUser
        }
      } 
  }, [pubKey, inMemoryUser]);

  return user
}

export function useKeys(pubKeys: HexKey[]): Map<HexKey, MetadataCache> {
  const { users } = useSelector((s: RootState) => s.users)

  const inMemoryUsers = useMemo(() => {
    const res = new Map()
    Object.values(users).forEach(u => {
      const profile = u as MetadataCache
      if (pubKeys.includes(profile.pubkey)) {
        res.set(profile.pubkey, profile)
      }
    })
    return res
  }, [users, pubKeys])

  const dbUsers = useLiveQuery(async () => {
      if (pubKeys) {
        try {
          const ret = await db.users.bulkGet(pubKeys);
          // @ts-ignore
          return new Map(ret.map(a => [a.pubkey, a]))
        } catch (error) {
          return inMemoryUsers
        }
      }
      return new Map()
  }, [pubKeys, inMemoryUsers]);

  return dbUsers || inMemoryUsers
}

