import * as secp from "@noble/curves/secp256k1";
import * as utils from "@noble/curves/abstract/utils";

import { HexKey, RelaySettings, EventPublisher, Nip46Signer, Nip7Signer, PrivateKeySigner } from "@snort/system";
import { deepClone, sanitizeRelayUrl, unwrap, ExternalStore } from "@snort/shared";

import { DefaultRelays } from "Const";
import { LoginSession, LoginSessionType } from "Login";
import { DefaultPreferences, UserPreferences } from "./Preferences";
import { Nip7OsSigner } from "./Nip7OsSigner";

const AccountStoreKey = "sessions";
const LoggedOut = {
  type: "public_key",
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
      const logins = JSON.parse(existing);
      this.#accounts = new Map((logins as Array<LoginSession>).map(a => [unwrap(a.publicKey), a]));
    } else {
      this.#accounts = new Map();
    }
    this.#migrate();
    if (!this.#activeAccount) {
      this.#activeAccount = this.#accounts.keys().next().value;
    }
    for (const [, v] of this.#accounts) {
      v.publisher = this.#createPublisher(v);
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

  loginWithPubkey(
    key: HexKey,
    type: LoginSessionType,
    relays?: Record<string, RelaySettings>,
    remoteSignerRelays?: Array<string>,
    privateKey?: string
  ) {
    if (this.#accounts.has(key)) {
      throw new Error("Already logged in with this pubkey");
    }
    const initRelays = this.decideInitRelays(relays);
    const newSession = {
      ...LoggedOut,
      type,
      publicKey: key,
      relays: {
        item: initRelays,
        timestamp: 1,
      },
      preferences: deepClone(DefaultPreferences),
      remoteSignerRelays,
      privateKey,
    } as LoginSession;
    newSession.publisher = this.#createPublisher(newSession);

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
      type: LoginSessionType.PrivateKey,
      privateKey: key,
      publicKey: pubKey,
      generatedEntropy: entropy,
      relays: {
        item: initRelays,
        timestamp: 1,
      },
      preferences: deepClone(DefaultPreferences),
    } as LoginSession;

    if("nostr_os" in window && window.nostr_os) {
      window.nostr_os.saveKey(key);
      newSession.type = LoginSessionType.Nip7os;
      newSession.privateKey = undefined;
    }
    newSession.publisher = this.#createPublisher(newSession);

    this.#accounts.set(pubKey, newSession);
    this.#activeAccount = pubKey;
    this.#save();
    return newSession;
  }

  updateSession(s: LoginSession) {
    const pk = unwrap(s.publicKey);
    if (this.#accounts.has(pk)) {
      this.#accounts.set(pk, s);
      console.debug("SET SESSION", s);
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

    return { ...s };
  }

  #createPublisher(l: LoginSession) {
    switch (l.type) {
      case LoginSessionType.PrivateKey: {
        return EventPublisher.privateKey(unwrap(l.privateKey));
      }
      case LoginSessionType.Nip46: {
        const relayArgs = (l.remoteSignerRelays ?? []).map(a => `relay=${encodeURIComponent(a)}`);
        const inner = new PrivateKeySigner(unwrap(l.privateKey));
        const nip46 = new Nip46Signer(`bunker://${unwrap(l.publicKey)}?${[...relayArgs].join("&")}`, inner);
        return new EventPublisher(nip46, unwrap(l.publicKey));
      }
      case LoginSessionType.Nip7os: {
        return new EventPublisher(new Nip7OsSigner(), unwrap(l.publicKey));
      }
      default: {
        if (l.publicKey) {
          return new EventPublisher(new Nip7Signer(), l.publicKey);
        }
      }
    }
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

    // replace default tab with notes
    for (const [, v] of this.#accounts) {
      if ((v.preferences.defaultRootTab as string) === "posts") {
        v.preferences.defaultRootTab = "notes";
        didMigrate = true;
      }
    }

    // update session types
    for (const [, v] of this.#accounts) {
      if (!v.type) {
        v.type = v.privateKey ? LoginSessionType.PrivateKey : LoginSessionType.Nip7;
        didMigrate = true;
      }
    }

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
