import { createSlice } from '@reduxjs/toolkit'

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
        users: {}
    },
    reducers: {
        addPubKey: (state, action) => {
            let keys = action.payload;
            if (!Array.isArray(keys)) {
                keys = [keys];
            }
            let temp = new Set(state.pubKeys);
            for (let k of keys) {
                temp.add(k);

                // load from cache
                let cache = window.localStorage.getItem(`user:${k}`);
                if (cache) {
                    let ud = JSON.parse(cache);
                    state.users[ud.pubkey] = ud;
                }
            }
            state.pubKeys = Array.from(temp);
        },
        setUserData: (state, action) => {
            let ud = action.payload;
            if (!Array.isArray(ud)) {
                ud = [ud];
            }
            for (let x of ud) {
                let existing = state.users[ud.pubkey];
                if (existing) {
                    ud = {
                        ...existing,
                        ...ud
                    };
                }
                state.users[ud.pubkey] = ud;
                window.localStorage.setItem(`user:${ud.pubkey}`, JSON.stringify(ud));
            }
        }
    }
});

export const { addPubKey, setUserData } = UsersSlice.actions;
export const reducer = UsersSlice.reducer;