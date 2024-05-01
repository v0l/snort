/* eslint-disable max-lines */
import * as utils from "@noble/curves/abstract/utils";
import * as secp from "@noble/curves/secp256k1";
import { ExternalStore, unwrap } from "@snort/shared";
import {
  EventPublisher,
  HexKey,
  KeyStorage,
  NotEncrypted,
  RelaySettings,
  socialGraphInstance,
  UserState,
  UserStateObject,
} from "@snort/system";
import { v4 as uuid } from "uuid";

import { createPublisher, LoginSession, LoginSessionType, SnortAppData } from "@/Utils/Login/index";

import { DefaultPreferences } from "./Preferences";

const AccountStoreKey = "sessions";
const LoggedOut = {
  id: "default",
  type: "public_key",
  readonly: true,
  tags: {
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
    item: CONFIG.defaultRelays,
    timestamp: 0,
  },
  latestNotification: 0,
  readNotifications: 0,
  subscriptions: [],
  extraChats: [],
  stalker: false,
  state: new UserState<SnortAppData>("", {
    initAppdata: {
      preferences: DefaultPreferences,
    },
    encryptAppdata: true,
    appdataId: "snort",
  }),
} as LoginSession;

export class MultiAccountStore extends ExternalStore<LoginSession> {
  #activeAccount?: HexKey;
  #accounts: Map<string, LoginSession> = new Map();
  #publishers = new Map<string, EventPublisher>();

  constructor() {
    super();
    if (typeof ServiceWorkerGlobalScope !== "undefined" && globalThis instanceof ServiceWorkerGlobalScope) {
      // return if sw. we might want to use localForage (idb) to share keys between sw and app
      return;
    }
    const existing = window.localStorage.getItem(AccountStoreKey);
    if (existing) {
      const logins = JSON.parse(existing);
      this.#accounts = new Map((logins as Array<LoginSession>).map(a => [a.id, a]));
    } else {
      this.#accounts = new Map();
    }
    this.#migrate();
    if (!this.#activeAccount) {
      this.#activeAccount = this.#accounts.keys().next().value;
    }
    if (this.#activeAccount) {
      const pubKey = this.#accounts.get(this.#activeAccount)?.publicKey;
      socialGraphInstance.setRoot(pubKey || "");
    }
    for (const [, v] of this.#accounts) {
      // reset readonly on load
      if (v.type === LoginSessionType.PrivateKey && v.readonly) {
        v.readonly = false;
      }
      v.extraChats ??= [];
      if (v.privateKeyData) {
        v.privateKeyData = KeyStorage.fromPayload(v.privateKeyData as object);
      }
      const stateObj = v.state as unknown as UserStateObject<SnortAppData> | undefined;
      const stateClass = new UserState<SnortAppData>(
        v.publicKey!,
        {
          initAppdata: stateObj?.appdata ?? {
            preferences: {
              ...DefaultPreferences,
              ...CONFIG.defaultPreferences,
            },
          },
          encryptAppdata: true,
          appdataId: "snort",
        },
        stateObj,
      );
      stateClass.on("change", () => this.#save());
      v.state = stateClass;

      // always activate signer
      const signer = createPublisher(v);
      if (signer) {
        this.#publishers.set(v.id, signer);
      }
    }
    this.#loadIrisKeyIfExists();
  }

  getSessions() {
    return [...this.#accounts.values()].map(v => ({
      pubkey: unwrap(v.publicKey),
      id: v.id,
    }));
  }

  get(id: string) {
    const s = this.#accounts.get(id);
    if (s) {
      return { ...s };
    }
  }

  allSubscriptions() {
    return [...this.#accounts.values()].map(a => a.subscriptions).flat();
  }

  switchAccount(id: string) {
    if (this.#accounts.has(id)) {
      this.#activeAccount = id;
      const pubKey = this.#accounts.get(id)?.publicKey || "";
      socialGraphInstance.setRoot(pubKey);
      this.#save();
    }
  }

  getPublisher(id: string) {
    return this.#publishers.get(id);
  }

  setPublisher(id: string, pub: EventPublisher) {
    this.#publishers.set(id, pub);
    this.notifyChange();
  }

  loginWithPubkey(
    key: HexKey,
    type: LoginSessionType,
    relays?: Record<string, RelaySettings>,
    remoteSignerRelays?: Array<string>,
    privateKey?: KeyStorage,
    stalker?: boolean,
  ) {
    if (this.#accounts.has(key)) {
      throw new Error("Already logged in with this pubkey");
    }
    socialGraphInstance.setRoot(key);
    const initRelays = this.decideInitRelays(relays);
    const newSession = {
      ...LoggedOut,
      id: uuid(),
      readonly: type === LoginSessionType.PublicKey,
      type,
      publicKey: key,
      relays: {
        item: initRelays,
        timestamp: 1,
      },
      state: new UserState<SnortAppData>(key, {
        initAppdata: {
          preferences: {
            ...DefaultPreferences,
            ...CONFIG.defaultPreferences,
          },
        },
        encryptAppdata: true,
        appdataId: "snort",
      }),
      remoteSignerRelays,
      privateKeyData: privateKey,
      stalker: stalker ?? false,
    } as LoginSession;

    newSession.state.on("change", () => this.#save());
    const pub = createPublisher(newSession);
    if (pub) {
      this.#publishers.set(newSession.id, pub);
    }
    this.#accounts.set(newSession.id, newSession);
    this.#activeAccount = newSession.id;
    this.#save();
    return newSession;
  }

  decideInitRelays(relays: Record<string, RelaySettings> | undefined): Record<string, RelaySettings> {
    if (import.meta.env.VITE_SINGLE_RELAY) return { [import.meta.env.VITE_SINGLE_RELAY]: { read: true, write: true } };
    if (relays && Object.keys(relays).length > 0) {
      return relays;
    }
    return CONFIG.defaultRelays;
  }

  loginWithPrivateKey(key: KeyStorage, entropy?: string, relays?: Record<string, RelaySettings>) {
    const pubKey = utils.bytesToHex(secp.schnorr.getPublicKey(key.value));
    if (this.#accounts.has(pubKey)) {
      throw new Error("Already logged in with this pubkey");
    }
    socialGraphInstance.setRoot(pubKey);
    const initRelays = this.decideInitRelays(relays);
    const newSession = {
      ...LoggedOut,
      id: uuid(),
      type: LoginSessionType.PrivateKey,
      readonly: false,
      privateKeyData: key,
      publicKey: pubKey,
      generatedEntropy: entropy,
      relays: {
        item: initRelays,
        timestamp: 1,
      },
      state: new UserState<SnortAppData>(pubKey, {
        initAppdata: {
          preferences: {
            ...DefaultPreferences,
            ...CONFIG.defaultPreferences,
          },
        },
        encryptAppdata: true,
        appdataId: "snort",
      }),
    } as LoginSession;
    newSession.state.on("change", () => this.#save());

    if ("nostr_os" in window && window?.nostr_os) {
      window?.nostr_os.saveKey(key.value);
      newSession.type = LoginSessionType.Nip7os;
      newSession.privateKeyData = undefined;
    }
    const pub = EventPublisher.privateKey(key.value);
    this.#publishers.set(newSession.id, pub);

    this.#accounts.set(newSession.id, newSession);
    this.#activeAccount = newSession.id;
    this.#save();
    return newSession;
  }

  updateSession(s: LoginSession) {
    if (this.#accounts.has(s.id)) {
      this.#accounts.set(s.id, s);
      this.#save();
    }
  }

  removeSession(id: string) {
    if (this.#accounts.delete(id)) {
      if (this.#activeAccount === id) {
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

  #loadIrisKeyIfExists() {
    try {
      const irisKeyJSON = window.localStorage.getItem("iris.myKey");
      if (irisKeyJSON) {
        const irisKeyObj = JSON.parse(irisKeyJSON);
        if (irisKeyObj.priv) {
          const privateKey = new NotEncrypted(irisKeyObj.priv);
          this.loginWithPrivateKey(privateKey);
          window.localStorage.removeItem("iris.myKey");
        }
      }
    } catch (e) {
      console.error("Failed to load iris key", e);
    }
  }

  #migrate() {
    let didMigrate = false;

    // delete some old keys
    for (const [, acc] of this.#accounts) {
      if ("appData" in acc) {
        delete acc["appData"];
        didMigrate = true;
      }
      if ("contacts" in acc) {
        delete acc["contacts"];
        didMigrate = true;
      }
      if ("follows" in acc) {
        delete acc["follows"];
        didMigrate = true;
      }
      if ("relays" in acc) {
        delete acc["relays"];
        didMigrate = true;
      }
      if ("blocked" in acc) {
        delete acc["blocked"];
        didMigrate = true;
      }
      if ("bookmarked" in acc) {
        delete acc["bookmarked"];
        didMigrate = true;
      }
      if ("muted" in acc) {
        delete acc["muted"];
        didMigrate = true;
      }
      if ("pinned" in acc) {
        delete acc["pinned"];
        didMigrate = true;
      }
      if ("tags" in acc) {
        delete acc["tags"];
        didMigrate = true;
      }
      if (acc.state && acc.state.appdata) {
        if ("id" in acc.state.appdata) {
          delete acc.state.appdata["id"];
          didMigrate = true;
        }
        if ("mutedWords" in acc.state.appdata) {
          delete acc.state.appdata["mutedWords"];
          didMigrate = true;
        }
        if ("showContentWarningPosts" in acc.state.appdata) {
          delete acc.state.appdata["showContentWarningPosts"];
          didMigrate = true;
        }
      }
    }

    if (didMigrate) {
      console.debug("Finished migration in MultiAccountStore");
      this.#save();
    }
  }

  #save() {
    if (!this.#activeAccount && this.#accounts.size > 0) {
      this.#activeAccount = this.#accounts.keys().next().value;
    }
    const toSave = [];
    for (const v of this.#accounts.values()) {
      if (v.privateKeyData instanceof KeyStorage) {
        toSave.push({
          ...v,
          state: v.state instanceof UserState ? v.state.serialize() : v.state,
          privateKeyData: v.privateKeyData.toPayload(),
        });
      } else {
        toSave.push({
          ...v,
          state: v.state instanceof UserState ? v.state.serialize() : v.state,
        });
      }
    }

    console.debug("Trying to save", toSave);
    window.localStorage.setItem(AccountStoreKey, JSON.stringify(toSave));
    this.notifyChange();
  }
}
