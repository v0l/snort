import { createSlice } from '@reduxjs/toolkit'
import { ProfileCacheExpire } from '../Const';
import { db } from '../db';

const UsersSlice = createSlice({
    name: "Users",
    initialState: {
        /**
         * Set of known pubkeys
         */
        pubKeys: [],

        /**
         * User objects for known pubKeys, populated async
         */
        users: {},
    },
    reducers: {
        addPubKey: (state, action) => {
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
                        let ud = JSON.parse(cache);
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
        setUserData: (state, action) => {
            let ud = action.payload;
            if (!Array.isArray(ud)) {
                ud = [ud];
            }

            for (let x of ud) {
                let existing = state.users[x.pubkey];
                if (existing) {
                    if (existing.fromEvent.created_at > x.fromEvent.created_at) {
                        // prevent patching with older metadata 
                        continue;
                    }
                    x = {
                        ...existing,
                        ...x
                    };
                }
                state.users[x.pubkey] = x;
                db.users.put({
                  pubkey: x.pubkey,
                  name: x.name,
                  display_name: x.display_name,
                  nip05: x.nip05,
                  picture: x.picture,
                  about: x.about,
                })

                state.users = {
                    ...state.users
                };
            }
        },
        resetProfile: (state, action) => {
            if (state.users[action.payload]) {
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