import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { HexKey, TaggedRawEvent, UserMetadata } from "Nostr";
import { hexToBech32 } from "../Util";

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

export interface UsersDb {
  isAvailable(): boolean
  query(str: string): Promise<MetadataCache[]>
  find(key: HexKey): Promise<MetadataCache | undefined>
  add(user: MetadataCache): Promise<any>
  put(user: MetadataCache): Promise<any>
  bulkAdd(users: MetadataCache[]): Promise<any>
  bulkGet(keys: HexKey[]): Promise<MetadataCache[]>
  bulkPut(users: MetadataCache[]): Promise<any>
  update(key: HexKey, fields: Record<string, any>): Promise<any>
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

export const { setUsers } = UsersSlice.actions

export const reducer = UsersSlice.reducer;
