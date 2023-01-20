import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import * as secp from '@noble/secp256k1';
import { DefaultRelays } from 'Const';
import { HexKey, RawEvent, TaggedRawEvent } from 'Nostr';
import { RelaySettings } from 'Nostr/Connection';

const PrivateKeyItem = "secret";
const PublicKeyItem = "pubkey";
const NotificationsReadItem = "notifications-read";

interface LoginStore {
    /**
     * If there is no login
     */
    loggedOut?: boolean,

    /**
     * Current user private key
     */
    privateKey?: HexKey,

    /**
     * Current users public key
     */
    publicKey?: HexKey,

    /**
     * All the logged in users relays
     */
    relays: Record<string, RelaySettings>,

    /**
     * Newest relay list timestamp
     */
    latestRelays: number,

    /**
     * A list of pubkeys this user follows
     */
    follows: HexKey[],

    /**
     * Notifications for this login session
     */
    notifications: TaggedRawEvent[],

    /**
    * Timestamp of last read notification
    */
    readNotifications: number,

    /**
     * Encrypted DM's
     */
    dms: TaggedRawEvent[],

    /**
     * Counter to trigger refresh of unread dms
     */
    dmInteraction: 0
};

const InitState = {
    loggedOut: undefined,
    publicKey: undefined,
    privateKey: undefined,
    relays: {},
    latestRelays: 0,
    follows: [],
    notifications: [],
    readNotifications: new Date().getTime(),
    dms: [],
    dmInteraction: 0
} as LoginStore;

export interface SetRelaysPayload {
    relays: Record<string, RelaySettings>,
    createdAt: number
};

const LoginSlice = createSlice({
    name: "Login",
    initialState: InitState,
    reducers: {
        init: (state) => {
            state.privateKey = window.localStorage.getItem(PrivateKeyItem) ?? undefined;
            if (state.privateKey) {
                window.localStorage.removeItem(PublicKeyItem); // reset nip07 if using private key
                state.publicKey = secp.utils.bytesToHex(secp.schnorr.getPublicKey(state.privateKey));
                state.loggedOut = false;
            } else {
                state.loggedOut = true;
            }

            state.relays = Object.fromEntries(DefaultRelays.entries());

            // check pub key only
            let pubKey = window.localStorage.getItem(PublicKeyItem);
            if (pubKey && !state.privateKey) {
                state.publicKey = pubKey;
                state.loggedOut = false;
            }

            // notifications
            let readNotif = parseInt(window.localStorage.getItem(NotificationsReadItem) ?? "0");
            if (!isNaN(readNotif)) {
                state.readNotifications = readNotif;
            }
        },
        setPrivateKey: (state, action: PayloadAction<HexKey>) => {
            state.loggedOut = false;
            state.privateKey = action.payload;
            window.localStorage.setItem(PrivateKeyItem, action.payload);
            state.publicKey = secp.utils.bytesToHex(secp.schnorr.getPublicKey(action.payload));
        },
        setPublicKey: (state, action: PayloadAction<HexKey>) => {
            window.localStorage.setItem(PublicKeyItem, action.payload);
            state.loggedOut = false;
            state.publicKey = action.payload;
        },
        setRelays: (state, action: PayloadAction<SetRelaysPayload>) => {
            let relays = action.payload.relays;
            let createdAt = action.payload.createdAt;
            if (state.latestRelays > createdAt) {
                return;
            }

            // filter out non-websocket urls
            let filtered = new Map<string, RelaySettings>();
            for (let [k, v] of Object.entries(relays)) {
                if (k.startsWith("wss://") || k.startsWith("ws://")) {
                    filtered.set(k, <RelaySettings>v);
                }
            }

            state.relays = Object.fromEntries(filtered.entries());
            state.latestRelays = createdAt;
        },
        removeRelay: (state, action: PayloadAction<string>) => {
            delete state.relays[action.payload];
            state.relays = { ...state.relays };
        },
        setFollows: (state, action: PayloadAction<string | string[]>) => {
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
        addNotifications: (state, action: PayloadAction<TaggedRawEvent | TaggedRawEvent[]>) => {
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
        addDirectMessage: (state, action: PayloadAction<TaggedRawEvent | Array<TaggedRawEvent>>) => {
            let n = action.payload;
            if (!Array.isArray(n)) {
                n = [n];
            }

            let didChange = false;
            for (let x of n) {
                if (!state.dms.some(a => a.id === x.id)) {
                    state.dms.push(x);
                    didChange = true;
                }
            }
            if (didChange) {
                state.dms = [
                    ...state.dms
                ];
            }
        },
        incDmInteraction: (state) => {
            state.dmInteraction += 1;
        },
        logout: (state) => {
            window.localStorage.clear();
            Object.assign(state, InitState);
            state.loggedOut = true;
            state.relays = Object.fromEntries(DefaultRelays.entries());
        },
        markNotificationsRead: (state) => {
            state.readNotifications = new Date().getTime();
            window.localStorage.setItem(NotificationsReadItem, state.readNotifications.toString());
        }
    }
});

export const {
    init,
    setPrivateKey,
    setPublicKey,
    setRelays,
    removeRelay,
    setFollows,
    addNotifications,
    addDirectMessage,
    incDmInteraction,
    logout,
    markNotificationsRead
} = LoginSlice.actions;
export const reducer = LoginSlice.reducer;