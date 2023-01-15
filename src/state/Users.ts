import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { ProfileCacheExpire } from '../Const';
import { db } from '../db';
import { HexKey, UserMetadata } from '../nostr';

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
};

export interface UsersStore {
    pubKeys: HexKey[],
    users: any
};

const UsersSlice = createSlice({
    name: "Users",
    initialState: <UsersStore>{
        pubKeys: [],
        users: {},
    },
    reducers: {
        addPubKey: (state, action: PayloadAction<string | Array<string>>) => {
            let keys = action.payload;
            if (!Array.isArray(keys)) {
                keys = [keys];
            }
            let changes = false;
            let fromCache = false;
            let temp = new Set(state.pubKeys);
            for (let k of keys) {
                if (!temp.has(k)) {
                    changes = true;
                    temp.add(k);

                    // load from cache
                    let cache = window.localStorage.getItem(`user:${k}`);
                    if (cache) {
                        let ud: MetadataCache = JSON.parse(cache);
                        if (ud.loaded > new Date().getTime() - ProfileCacheExpire) {
                            state.users[ud.pubkey] = ud;
                            fromCache = true;
                        }
                    }
                }
            }
            if (changes) {
                state.pubKeys = Array.from(temp);
                if (fromCache) {
                    state.users = {
                        ...state.users
                    };
                }
            }
        },
        setUserData: (state, action: PayloadAction<MetadataCache | Array<MetadataCache>>) => {
            let ud = action.payload;
            if (!Array.isArray(ud)) {
                ud = [ud];
            }

            for (let x of ud) {
                let existing = state.users[x.pubkey];
                if (existing) {
                    if (existing.created > x.created) {
                        // prevent patching with older metadata 
                        continue;
                    }
                    x = {
                        ...existing,
                        ...x
                    };
                }
                state.users[x.pubkey] = x;
                db.users.put(x)

                state.users = {
                    ...state.users
                };
            }
        },
        resetProfile: (state, action: PayloadAction<HexKey>) => {
            if (action.payload in state.users) {
                delete state.users[action.payload];
                state.users = {
                    ...state.users
                };
            }
        }
    }
});

export const { addPubKey, setUserData, resetProfile } = UsersSlice.actions;
export const reducer = UsersSlice.reducer;