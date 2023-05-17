import * as secp from "@noble/curves/secp256k1";
import * as utils from "@noble/curves/abstract/utils";

import { HexKey, RelaySettings } from "@snort/nostr";

import { DefaultRelays } from "Const";
import ExternalStore from "ExternalStore";
import { LoginSession } from "Login";
import { deepClone, sanitizeRelayUrl, unwrap } from "Util";
import { DefaultPreferences, UserPreferences } from "./Preferences";

const AccountStoreKey = "sessions";
const LoggedOut = {
  preferences: DefaultPreferences,
  tags: {
    item: [],
    timestamp: 0,
  },
  follows: {
    item: [],
    timestamp: 0,
  },
  muted: {
    item: [],
    timestamp: 0,
  },
  blocked: {
    item: [],
    timestamp: 0,
  },
  bookmarked: {
    item: [],
    timestamp: 0,
  },
  pinned: {
    item: [],
    timestamp: 0,
  },
  relays: {
    item: Object.fromEntries([...DefaultRelays.entries()].map(a => [unwrap(sanitizeRelayUrl(a[0])), a[1]])),
    timestamp: 0,
  },
  latestNotification: 0,
  readNotifications: 0,
  subscriptions: [],
} as LoginSession;
const LegacyKeys = {
  PrivateKeyItem: "secret",
  PublicKeyItem: "pubkey",
  NotificationsReadItem: "notifications-read",
  UserPreferencesKey: "preferences",
  RelayListKey: "last-relays",
  FollowList: "last-follows",
};

export class MultiAccountStore extends ExternalStore<LoginSession> {
  #activeAccount?: HexKey;
  #accounts: Map<string, LoginSession>;

  constructor() {
    super();
    const existing = window.localStorage.getItem(AccountStoreKey);
    if (existing) {
      this.#accounts = new Map((JSON.parse(existing) as Array<LoginSession>).map(a => [unwrap(a.publicKey), a]));
    } else {
      this.#accounts = new Map();
    }
    this.#migrate();
    if (!this.#activeAccount) {
      this.#activeAccount = this.#accounts.keys().next().value;
    }
  }

  getSessions() {
    return [...this.#accounts.keys()];
  }

  allSubscriptions() {
    return [...this.#accounts.values()].map(a => a.subscriptions).flat();
  }

  switchAccount(pk: string) {
    if (this.#accounts.has(pk)) {
      this.#activeAccount = pk;
      this.#save();
    }
  }

  loginWithPubkey(key: HexKey, relays?: Record<string, RelaySettings>) {
    if (this.#accounts.has(key)) {
      throw new Error("Already logged in with this pubkey");
    }
    const initRelays = this.decideInitRelays(relays);
    const newSession = {
      ...LoggedOut,
      publicKey: key,
      relays: {
        item: initRelays,
        timestamp: 1,
      },
      preferences: deepClone(DefaultPreferences),
    } as LoginSession;

    this.#accounts.set(key, newSession);
    this.#activeAccount = key;
    this.#save();
    return newSession;
  }

  decideInitRelays(relays: Record<string, RelaySettings> | undefined): Record<string, RelaySettings> {
    if (relays && Object.keys(relays).length > 0) {
      return relays;
    }
    return Object.fromEntries(DefaultRelays.entries());
  }

  loginWithPrivateKey(key: HexKey, entropy?: string, relays?: Record<string, RelaySettings>) {
    const pubKey = utils.bytesToHex(secp.schnorr.getPublicKey(key));
    if (this.#accounts.has(pubKey)) {
      throw new Error("Already logged in with this pubkey");
    }
    const initRelays = relays ?? Object.fromEntries(DefaultRelays.entries());
    const newSession = {
      ...LoggedOut,
      privateKey: key,
      publicKey: pubKey,
      generatedEntropy: entropy,
      relays: {
        item: initRelays,
        timestamp: 1,
      },
      preferences: deepClone(DefaultPreferences),
    } as LoginSession;
    this.#accounts.set(pubKey, newSession);
    this.#activeAccount = pubKey;
    this.#save();
    return newSession;
  }

  updateSession(s: LoginSession) {
    const pk = unwrap(s.publicKey);
    if (this.#accounts.has(pk)) {
      this.#accounts.set(pk, s);
      this.#save();
    }
  }

  removeSession(k: string) {
    if (this.#accounts.delete(k)) {
      if (this.#activeAccount === k) {
        this.#activeAccount = undefined;
      }
      this.#save();
    }
  }

  takeSnapshot(): LoginSession {
    const s = this.#activeAccount ? this.#accounts.get(this.#activeAccount) : undefined;
    if (!s) return LoggedOut;

    return deepClone(s);
  }

  #migrate() {
    let didMigrate = false;
    const oldPreferences = window.localStorage.getItem(LegacyKeys.UserPreferencesKey);
    const pref: UserPreferences = oldPreferences ? JSON.parse(oldPreferences) : deepClone(DefaultPreferences);
    window.localStorage.removeItem(LegacyKeys.UserPreferencesKey);

    const privKey = window.localStorage.getItem(LegacyKeys.PrivateKeyItem);
    if (privKey) {
      const pubKey = utils.bytesToHex(secp.schnorr.getPublicKey(privKey));
      this.#accounts.set(pubKey, {
        ...LoggedOut,
        privateKey: privKey,
        publicKey: pubKey,
        preferences: pref,
      } as LoginSession);
      window.localStorage.removeItem(LegacyKeys.PrivateKeyItem);
      window.localStorage.removeItem(LegacyKeys.PublicKeyItem);
      didMigrate = true;
    }

    const pubKey = window.localStorage.getItem(LegacyKeys.PublicKeyItem);
    if (pubKey) {
      this.#accounts.set(pubKey, {
        ...LoggedOut,
        publicKey: pubKey,
        preferences: pref,
      } as LoginSession);
      window.localStorage.removeItem(LegacyKeys.PublicKeyItem);
      didMigrate = true;
    }

    window.localStorage.removeItem(LegacyKeys.RelayListKey);
    window.localStorage.removeItem(LegacyKeys.FollowList);
    window.localStorage.removeItem(LegacyKeys.NotificationsReadItem);
    if (didMigrate) {
      console.debug("Finished migration to MultiAccountStore");
      this.#save();
    }
  }

  #save() {
    if (!this.#activeAccount && this.#accounts.size > 0) {
      this.#activeAccount = [...this.#accounts.keys()][0];
    }
    window.localStorage.setItem(AccountStoreKey, JSON.stringify([...this.#accounts.values()]));
    this.notifyChange();
  }
}
