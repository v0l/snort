import { createSlice } from '@reduxjs/toolkit'
import * as secp from '@noble/secp256k1';

const PrivateKeyItem = "secret";
const RelayList = "relays";
const DefaultRelays = JSON.stringify([
    "wss://nostr-pub.wellorder.net",
    "wss://relay.damus.io",
    "wss://beta.nostr.v0l.io"
]);

const LoginSlice = createSlice({
    name: "Login",
    initialState: {
        /**
         * Current user private key
         */
        privateKey: null,

        /**
         * Current users public key
         */
        publicKey: null,

        /** 
         * Configured relays for this user
         */
        relays: []
    },
    reducers: {
        init: (state) => {
            state.privateKey = window.localStorage.getItem(PrivateKeyItem);
            if(state.privateKey) {
                state.publicKey = secp.utils.bytesToHex(secp.schnorr.getPublicKey(state.privateKey, true));
            }
            state.relays = JSON.parse(window.localStorage.getItem(RelayList) || DefaultRelays);
        },
        setPrivateKey: (state, action) => {
            state.privateKey = action.payload;
            window.localStorage.setItem(PrivateKeyItem, action.payload);
            state.publicKey = secp.utils.bytesToHex(secp.schnorr.getPublicKey(action.payload, true));
        },
        logout: (state) => {
            state.privateKey = null;
            window.localStorage.removeItem(PrivateKeyItem);
        }
    }
});

export const { init, setPrivateKey, logout } = LoginSlice.actions;
export const reducer = LoginSlice.reducer;