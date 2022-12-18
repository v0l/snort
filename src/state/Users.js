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
            if (!state.pubKeys.includes(action.payload)) {
                let temp = new Set(state.pubKeys);
                temp.add(action.payload);
                state.pubKeys = Array.from(temp);
            }
            
            // load from cache
            let cache = window.localStorage.getItem(`user:${action.payload}`);
            if(cache) {
                let ud = JSON.parse(cache);
                state.users[ud.pubkey] = ud;
            }
        },
        setUserData: (state, action) => {
            let ud = action.payload;
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
});

export const { addPubKey, setUserData } = UsersSlice.actions;
export const reducer = UsersSlice.reducer;