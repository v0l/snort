import { useLiveQuery } from "dexie-react-hooks";
import { MetadataCache } from "State/Users";
import db, { inMemoryDb } from "State/Users/Db";
import { HexKey } from "Nostr";

export function useQuery(query: string, limit: number = 5) {
  const allUsers = useLiveQuery(
    () => db.query(query)
          .catch((err) => {
            console.error(err)
          }).then(() => {
            return inMemoryDb.query(query)
          }),
    [query],
  )

  return allUsers
}

export function useKey(pubKey: HexKey) {
  // @ts-ignore
  const defaultUser = inMemoryDb.users[pubKey]
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
  const dbUsers = useLiveQuery(async () => {
      if (pubKeys) {
        try {
          const ret = await db.bulkGet(pubKeys);
          return new Map(ret.map(a => [a.pubkey, a]))
        } catch (error) {
          console.error(error)
          const ret = await inMemoryDb.bulkGet(pubKeys);
          return new Map(ret.map(a => [a.pubkey, a]))
        }
      }
      return new Map()
  }, [pubKeys]);

  return dbUsers!
}
