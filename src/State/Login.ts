import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import * as secp from '@noble/secp256k1';
import { DefaultRelays } from 'Const';
import { HexKey, TaggedRawEvent } from 'Nostr';
import { RelaySettings } from 'Nostr/Connection';

const PrivateKeyItem = "secret";
const PublicKeyItem = "pubkey";
const NotificationsReadItem = "notifications-read";
const UserPreferencesKey = "preferences";
const RelayListKey = "last-relays";
const FollowList = "last-follows";

export interface UserPreferences {
    /**
     * Enable reactions / reposts / zaps
     */
    enableReactions: boolean,

    /**
     * Automatically load media (show link only) (bandwidth/privacy)
     */
    autoLoadMedia: boolean,

    /**
     * Select between light/dark theme
     */
    theme: "system" | "light" | "dark",

    /**
     * Ask for confirmation when reposting notes
     */
    confirmReposts: boolean,

    /**
     * Automatically show the latests notes 
     */
    autoShowLatest: boolean,

    /**
     * Show debugging menus to help diagnose issues
     */
    showDebugMenus: boolean
}

export interface LoginStore {
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
    dmInteraction: 0,

    /**
     * Users cusom preferences
     */
    preferences: UserPreferences
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
    dmInteraction: 0,
    preferences: {
        enableReactions: true,
        autoLoadMedia: true,
        theme: "system",
        confirmReposts: false,
        showDebugMenus: false,
        autoShowLatest: false
    }
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

            // check pub key only
            let pubKey = window.localStorage.getItem(PublicKeyItem);
            if (pubKey && !state.privateKey) {
                state.publicKey = pubKey;
                state.loggedOut = false;
            }

            let lastRelayList = window.localStorage.getItem(RelayListKey);
            if (lastRelayList) {
                state.relays = JSON.parse(lastRelayList);
            } else {
                state.relays = Object.fromEntries(DefaultRelays.entries());
            }

            let lastFollows = window.localStorage.getItem(FollowList);
            if (lastFollows) {
                state.follows = JSON.parse(lastFollows);
            }

            // notifications
            let readNotif = parseInt(window.localStorage.getItem(NotificationsReadItem) ?? "0");
            if (!isNaN(readNotif)) {
                state.readNotifications = readNotif;
            }

            // preferences
            let pref = window.localStorage.getItem(UserPreferencesKey);
            if (pref) {
                state.preferences = JSON.parse(pref);
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
                    filtered.set(k, v as RelaySettings);
                }
            }

            state.relays = Object.fromEntries(filtered.entries());
            state.latestRelays = createdAt;
            window.localStorage.setItem(RelayListKey, JSON.stringify(state.relays));
        },
        removeRelay: (state, action: PayloadAction<string>) => {
            delete state.relays[action.payload];
            state.relays = { ...state.relays };
            window.localStorage.setItem(RelayListKey, JSON.stringify(state.relays));
        },
        setFollows: (state, action: PayloadAction<HexKey | HexKey[]>) => {
            let existing = new Set(state.follows);
            let update = Array.isArray(action.payload) ? action.payload : [action.payload];

            let changes = false;
            for (let pk of update.filter(a => a.length === 64)) {
                if (!existing.has(pk)) {
                    existing.add(pk);
                    changes = true;
                }
            }
            for (let pk of existing) {
                if (!update.includes(pk)) {
                    existing.delete(pk);
                    changes = true;
                }
            }

            if (changes) {
                state.follows = Array.from(existing);
            }

            window.localStorage.setItem(FollowList, JSON.stringify(state.follows));
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
            Object.assign(state, InitState);
            state.loggedOut = true;
            state.relays = Object.fromEntries(DefaultRelays.entries());
            window.localStorage.clear();
        },
        markNotificationsRead: (state) => {
            state.readNotifications = new Date().getTime();
            window.localStorage.setItem(NotificationsReadItem, state.readNotifications.toString());
        },
        setPreferences: (state, action: PayloadAction<UserPreferences>) => {
            state.preferences = action.payload;
            window.localStorage.setItem(UserPreferencesKey, JSON.stringify(state.preferences));
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
    markNotificationsRead,
    setPreferences
} = LoginSlice.actions;
export const reducer = LoginSlice.reducer;
