import { createSlice } from '@reduxjs/toolkit'
import * as secp from '@noble/secp256k1';
import { DefaultRelays } from '../Const';

const PrivateKeyItem = "secret";
const PublicKeyItem = "pubkey";
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
                window.localStorage.removeItem(PublicKeyItem); // reset nip07 if using private key
                state.publicKey = secp.utils.bytesToHex(secp.schnorr.getPublicKey(state.privateKey, true));
                state.loggedOut = false;
            } else {
                state.loggedOut = true;
            }

            state.relays = DefaultRelays;

            // check pub key only
            let pubKey = window.localStorage.getItem(PublicKeyItem);
            if (pubKey && !state.privateKey) {
                state.publicKey = pubKey;
                state.loggedOut = false;
            }

            // notifications
            let readNotif = parseInt(window.localStorage.getItem(NotificationsReadItem));
            if (!isNaN(readNotif)) {
                state.readNotifications = readNotif;
            }
        },
        setPrivateKey: (state, action) => {
            state.loggedOut = false;
            state.privateKey = action.payload;
            window.localStorage.setItem(PrivateKeyItem, action.payload);
            state.publicKey = secp.utils.bytesToHex(secp.schnorr.getPublicKey(action.payload, true));
        },
        setPublicKey: (state, action) => {
            window.localStorage.setItem(PublicKeyItem, action.payload);
            state.loggedOut = false;
            state.publicKey = action.payload;
        },
        setRelays: (state, action) => {
            // filter out non-websocket urls
            let filtered = Object.entries({ ...state.relays, ...action.payload })
                .filter(a => a[0].startsWith("ws://") || a[0].startsWith("wss://"));

            state.relays = Object.fromEntries(filtered);
        },
        removeRelay: (state, action) => {
            delete state.relays[action.payload];
            state.relays = { ...state.relays };
        },
        setFollows: (state, action) => {
            let existing = new Set(state.follows);
            let update = Array.isArray(action.payload) ? action.payload : [action.payload];

            let changes = false;
            for (let pk of update) {
                if (!existing.has(pk)) {
                    existing.add(pk);
                    changes = true;
                }
            }
            if (changes) {
                state.follows = Array.from(existing);
            }
        },
        addNotifications: (state, action) => {
            let n = action.payload;
            if (!Array.isArray(n)) {
                n = [n];
            }

            let didChange = false;
            for (let x of n) {
                if (!state.notifications.some(a => a.id === x.id)) {
                    state.notifications.push(x);
                    didChange = true;
                }
            }
            if (didChange) {
                state.notifications = [
                    ...state.notifications
                ];
            }
        },
        logout: (state) => {
            window.localStorage.removeItem(PrivateKeyItem);
            window.localStorage.removeItem(PublicKeyItem);
            window.localStorage.removeItem(NotificationsReadItem);
            state.privateKey = null;
            state.publicKey = null;
            state.follows = [];
            state.notifications = [];
            state.loggedOut = true;
            state.readNotifications = 0;
        },
        markNotificationsRead: (state) => {
            state.readNotifications = new Date().getTime();
            window.localStorage.setItem(NotificationsReadItem, state.readNotifications);
        }
    }
});

export const { init, setPrivateKey, setPublicKey, setRelays, removeRelay, setFollows, addNotifications, logout, markNotificationsRead } = LoginSlice.actions;
export const reducer = LoginSlice.reducer;