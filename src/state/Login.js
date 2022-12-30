import { createSlice } from '@reduxjs/toolkit'
import * as secp from '@noble/secp256k1';

const PrivateKeyItem = "secret";
const Nip07PublicKeyItem = "nip07:pubkey";

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
        follows: [],

        /**
         * Login keys are managed by extension
         */
        nip07: false,

        /**
         * Notifications for this login session
         */
        notifications: []
    },
    reducers: {
        init: (state) => {
            state.privateKey = window.localStorage.getItem(PrivateKeyItem);
            if (state.privateKey) {
                window.localStorage.removeItem(Nip07PublicKeyItem); // reset nip07 if using private key
                state.publicKey = secp.utils.bytesToHex(secp.schnorr.getPublicKey(state.privateKey, true));
            }
            state.relays = {
                "wss://nostr.v0l.io": { read: true, write: true },
                "wss://relay.damus.io": { read: true, write: true },
                "wss://nostr-pub.wellorder.net": { read: true, write: true }
            };

            // check nip07 pub key
            let nip07PubKey = window.localStorage.getItem(Nip07PublicKeyItem);
            if (nip07PubKey && !state.privateKey) {
                state.publicKey = nip07PubKey;
                state.nip07 = true;
            }
        },
        setPrivateKey: (state, action) => {
            state.privateKey = action.payload;
            window.localStorage.setItem(PrivateKeyItem, action.payload);
            state.publicKey = secp.utils.bytesToHex(secp.schnorr.getPublicKey(action.payload, true));
        },
        setPublicKey: (state, action) => {
            state.publicKey = action.payload;
        },
        setNip07PubKey: (state, action) => {
            window.localStorage.setItem(Nip07PublicKeyItem, action.payload);
            state.publicKey = action.payload;
            state.nip07 = true;
        },
        setRelays: (state, action) => {
            state.relays = action.payload;
        },
        setFollows: (state, action) => {
            state.follows = action.payload;
        },
        addNotifications: (state, action) => {
            let n = action.payload;
            if (!Array.isArray(n)) {
                n = [n];
            }

            for (let x in n) {
                if (!state.notifications.some(a => a.id === x.id)) {
                    state.notifications.push(x);
                }
            }
            state.notifications = [
                ...state.notifications
            ];
        },
        logout: (state) => {
            state.privateKey = null;
            window.localStorage.removeItem(PrivateKeyItem);
        }
    }
});

export const { init, setPrivateKey, setPublicKey, setNip07PubKey, setRelays, setFollows, addNotifications, logout } = LoginSlice.actions;
export const reducer = LoginSlice.reducer;