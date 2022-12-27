import { createSlice } from '@reduxjs/toolkit'

const PrivateKeyItem = "secret";
const RelayList = "relays";
const DefaultRelays = JSON.stringify([
    "wss://nostr-pub.wellorder.net",
    "wss://relay.damus.io",
]);

const LoginSlice = createSlice({
    name: "Login",
    initialState: {
        /**
         * Current user private key
         */
        privateKey: window.localStorage.getItem(PrivateKeyItem),

        /** 
         * Configured relays for this user
         */
        relays: JSON.parse(window.localStorage.getItem(RelayList) || DefaultRelays)
    },
    reducers: {
        setPrivateKey: (state, action) => {
            state.privateKey = action.payload;
        },
        logout: (state) => {
            state.privateKey = null;
        }
    }
});

export const { setPrivateKey, logout } = LoginSlice.actions;
export const reducer = LoginSlice.reducer;