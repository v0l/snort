import { createSlice } from '@reduxjs/toolkit'
import * as secp from '@noble/secp256k1';

const PrivateKeyItem = "secret";

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
        relays: {},

        /**
         * A list of pubkeys this user follows
         */
        follows: []
    },
    reducers: {
        init: (state) => {
            state.privateKey = window.localStorage.getItem(PrivateKeyItem);
            if (state.privateKey) {
                state.publicKey = secp.utils.bytesToHex(secp.schnorr.getPublicKey(state.privateKey, true));
            }
            state.relays = {
                "wss://beta.nostr.v0l.io": { read: true, write: true },
                "wss://nostr.v0l.io": { read: true, write: true },
                "wss://relay.damus.io": { read: true, write: true },
                "wss://nostr-pub.wellorder.net": { read: true, write: true }
            };
        },
        setPrivateKey: (state, action) => {
            state.privateKey = action.payload;
            window.localStorage.setItem(PrivateKeyItem, action.payload);
            state.publicKey = secp.utils.bytesToHex(secp.schnorr.getPublicKey(action.payload, true));
        },
        setRelays: (state, action) => {
            state.relays = action.payload;
        },
        setFollows: (state, action) => {
            state.follows = action.payload;
        },
        logout: (state) => {
            state.privateKey = null;
            window.localStorage.removeItem(PrivateKeyItem);
        }
    }
});

export const { init, setPrivateKey, setRelays, setFollows, logout } = LoginSlice.actions;
export const reducer = LoginSlice.reducer;