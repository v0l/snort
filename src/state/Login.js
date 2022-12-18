import { createSlice } from '@reduxjs/toolkit'

const PrivateKeyItem = "secret";
const RelayList = "relays";
const DefaultRelays = JSON.stringify([
    "wss://nostr.v0l.io",
    "wss://nostr-pub.wellorder.net",
    "wss://nostr.zebedee.cloud",
    "wss://relay.damus.io",
    "wss://nostr.rocks",
    "wss://nostr.rocks",
    "wss://nostr.fmt.wiz.biz"
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