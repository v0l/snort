import { createSlice } from '@reduxjs/toolkit'
import * as secp from '@noble/secp256k1';

const PrivateKeyItem = "secret";
const Nip07PublicKeyItem = "nip07:pubkey";
const NotificationsReadItem = "notifications-read";

const LoginSlice = createSlice({
    name: "Login",
    initialState: {
        /**
         * If there is no login
         */
        loggedOut: null,

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
        notifications: [],

        /**
         * Timestamp of last read notification
         */
        readNotifications: 0,
    },
    reducers: {
        init: (state) => {
            state.privateKey = window.localStorage.getItem(PrivateKeyItem);
            if (state.privateKey) {
                window.localStorage.removeItem(Nip07PublicKeyItem); // reset nip07 if using private key
                state.publicKey = secp.utils.bytesToHex(secp.schnorr.getPublicKey(state.privateKey, true));
                state.loggedOut = false;
            } else {
                state.loggedOut = true;
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
                state.loggedOut = false;
            }

            // notifications
            let readNotif = parseInt(window.localStorage.getItem(NotificationsReadItem));
            if (!isNaN(readNotif)) {
                state.readNotifications = readNotif;
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
            // filter out non-websocket urls
            let filtered = Object.entries(action.payload)
                .filter(a => a[0].startsWith("ws://") || a[0].startsWith("wss://"));

            state.relays = Object.fromEntries(filtered);
        },
        setFollows: (state, action) => {
            state.follows = action.payload;
        },
        addNotifications: (state, action) => {
            let n = action.payload;
            if (!Array.isArray(n)) {
                n = [n];
            }

            for (let x of n) {
                if (!state.notifications.some(a => a.id === x.id)) {
                    state.notifications.push(x);
                }
            }
            state.notifications = [
                ...state.notifications
            ];
        },
        logout: (state) => {
            window.localStorage.removeItem(PrivateKeyItem);
            window.localStorage.removeItem(Nip07PublicKeyItem);
            state.privateKey = null;
            state.publicKey = null;
            state.follows = [];
            state.notifications = [];
        },
        markNotificationsRead: (state) => {
            state.readNotifications = new Date().getTime();
            window.localStorage.setItem(NotificationsReadItem, state.readNotifications);
        }
    }
});

export const { init, setPrivateKey, setPublicKey, setNip07PubKey, setRelays, setFollows, addNotifications, logout, markNotificationsRead } = LoginSlice.actions;
export const reducer = LoginSlice.reducer;