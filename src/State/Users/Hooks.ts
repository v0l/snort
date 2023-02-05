import { useSelector } from "react-redux"
import { useLiveQuery } from "dexie-react-hooks";
import { MetadataCache } from "State/Users";
import type { RootState } from "State/Store"
import { HexKey } from "Nostr";
import { useDb } from "./Db";

export function useQuery(query: string, limit: number = 5) {
  const db = useDb()
  return useLiveQuery(async () => db.query(query), [query],)
}

export function useKey(pubKey: HexKey) {
  const db = useDb()
  const { users } = useSelector((state: RootState) => state.users)
  const defaultUser = users[pubKey]

  const user = useLiveQuery(async () => {
    if (pubKey) {
      try {
        return await db.find(pubKey);
      } catch (error) {
        console.error(error)
        return defaultUser
      }
    }
  }, [pubKey, defaultUser]);

  return user
}

export function useKeys(pubKeys: HexKey[]): Map<HexKey, MetadataCache> {
  const db = useDb()
  const { users } = useSelector((state: RootState) => state.users)

  const dbUsers = useLiveQuery(async () => {
    if (pubKeys) {
      try {
        const ret = await db.bulkGet(pubKeys);
        return new Map(ret.map(a => [a.pubkey, a]))
      } catch (error) {
        console.error(error)
        return new Map(pubKeys.map(a => [a, users[a]]))
      }
    }
    return new Map()
  }, [pubKeys, users]);

  return dbUsers!
}
