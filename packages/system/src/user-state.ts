import { NostrLink, ToNostrEventTag } from "./nostr-link";
import { DiffSyncTags, JsonEventSync } from "./sync";
import EventKind from "./event-kind";
import {
  EventSigner,
  FullRelaySettings,
  RelaySettings,
  SystemInterface,
  UserMetadata,
  parseRelayTags,
  parseRelaysFromKind,
  settingsToRelayTag,
} from ".";
import { dedupe, removeUndefined, sanitizeRelayUrl, NostrPrefix } from "@snort/shared";
import debug from "debug";
import EventEmitter from "eventemitter3";

export interface UserStateOptions<T> {
  appdataId: string;
  initAppdata: T;
  encryptAppdata: boolean;
}

/**
 * Data which can be stored locally to quickly resume the state at startup
 */
export interface UserStateObject<TAppData> {
  profile?: UserMetadata;
  follows?: Array<string>;
  relays?: Array<FullRelaySettings>;
  appdata?: TAppData;
}

export const enum UserStateChangeType {
  Profile,
  Contacts,
  Relays,
  AppData,
  MuteList,
  GenericList,
}

export interface UserStateEvents {
  change: (t: UserStateChangeType) => void;
}

/**
 * Manages a users state, mostly to improve safe syncing
 */
export class UserState<TAppData> extends EventEmitter<UserStateEvents> {
  #log = debug("UserState");
  #profile?: JsonEventSync<UserMetadata | undefined>; // kind 0
  #contacts?: DiffSyncTags; // kind 3
  #relays?: DiffSyncTags; // kind 10_003
  #appdata?: JsonEventSync<TAppData>; // kind 30_0078
  #standardLists?: Map<EventKind, DiffSyncTags>; // NIP-51 lists

  // init vars
  #signer?: EventSigner;
  #system?: SystemInterface;

  // state object will be used in the getters as a fallback value
  #stateObj?: UserStateObject<TAppData>;
  #didInit = false;
  #version = 0;

  constructor(
    readonly pubkey: string,
    options?: Partial<UserStateOptions<TAppData>>,
    stateObj?: UserStateObject<TAppData>,
  ) {
    super();
    this.#stateObj = stateObj;
    this.#standardLists = pubkey ? new Map() : undefined;

    this.#profile = pubkey
      ? new JsonEventSync<UserMetadata | undefined>(
          undefined,
          new NostrLink(NostrPrefix.Event, pubkey, EventKind.SetMetadata, pubkey),
          false,
        )
      : undefined;
    this.#contacts = pubkey
      ? new DiffSyncTags(new NostrLink(NostrPrefix.Event, pubkey, EventKind.ContactList, pubkey), false)
      : undefined;
    this.#relays = pubkey
      ? new DiffSyncTags(new NostrLink(NostrPrefix.Event, pubkey, EventKind.Relays, pubkey), false)
      : undefined;
    if (options?.appdataId && options.initAppdata) {
      const link = new NostrLink(NostrPrefix.Address, options.appdataId, EventKind.AppData, pubkey);
      this.#appdata = new JsonEventSync<TAppData>(options.initAppdata, link, options.encryptAppdata ?? false);
      this.#appdata.on("change", () => this.emit("change", UserStateChangeType.AppData));
    }

    // always track mute list
    this.checkIsStandardList(EventKind.MuteList);

    this.#profile?.on("change", () => this.emit("change", UserStateChangeType.Profile));
    this.#contacts?.on("change", () => this.emit("change", UserStateChangeType.Contacts));
    this.#relays?.on("change", () => this.emit("change", UserStateChangeType.Relays));
    this.on("change", () => this.#version++);
  }

  get didInit() {
    return this.#didInit;
  }

  destroy() {
    this.#log("Shutdown");
    this.removeAllListeners();
  }

  async init(signer: EventSigner | undefined, system: SystemInterface) {
    if (this.#didInit) {
      return;
    }
    this.#didInit = true;
    this.#log("Init start");
    this.#signer = signer;
    this.#system = system;
    const tasks = [
      this.#profile?.sync(signer, system),
      this.#contacts?.sync(signer, system),
      this.#relays?.sync(signer, system),
    ];
    if (this.#appdata) {
      tasks.push(this.#appdata.sync(signer, system));
    }
    if (this.#standardLists) {
      for (const list of this.#standardLists.values()) {
        tasks.push(list.sync(signer, system));
      }
    }
    await Promise.all(tasks);
    this.#log(
      "Init results: signer=%s, profile=%O, contacts=%O, relays=%O, appdata=%O, lists=%O",
      signer ? "yes" : "no",
      this.#profile?.json,
      this.#contacts?.value,
      this.#relays?.value,
      this.#appdata?.json,
      [...(this.#standardLists?.values() ?? [])].map(a => [a.link.kind, a.value, a.encryptedTags]),
    );

    // update relay metadata with value from contact list if not found
    if (this.#relays?.value === undefined && this.#contacts?.value?.content !== undefined && signer) {
      this.#log("Saving relays to NIP-65 relay list using %O", this.relays);
      for (const r of this.relays ?? []) {
        await this.addRelay(r.url, r.settings, false);
      }

      await this.#relays?.persist(signer, system);
    }
  }

  get signer() {
    return this.#signer;
  }

  get version() {
    return this.#version;
  }

  /**
   * Users profile
   */
  get profile() {
    return this.#profile?.json ?? this.#stateObj?.profile;
  }

  /**
   * Users configured relays
   */
  get relays() {
    if (this.#relays?.value) {
      return parseRelayTags(this.#relays.tags);
    } else if (this.#contacts?.value) {
      return parseRelaysFromKind(this.#contacts.value);
    } else {
      return this.#stateObj?.relays;
    }
  }

  /**
   * Followed pubkeys
   */
  get follows() {
    if (this.#contacts?.value) {
      const pTags = this.#contacts.tags.filter(a => a[0] === "p" && a[1].length === 64).map(a => a[1]) ?? [];
      return dedupe(pTags);
    } else {
      return this.#stateObj?.follows;
    }
  }

  /**
   * App specific data
   */
  get appdata() {
    return this.#appdata?.json ?? this.#stateObj?.appdata;
  }

  /**
   * Get the standard mute list
   */
  get muted() {
    const list = this.#standardLists?.get(EventKind.MuteList);
    if (list) {
      return NostrLink.fromAllTags(list.encryptedTags);
    }
    return [];
  }

  async follow(link: NostrLink, autoCommit = false) {
    this.#checkInit();
    if (link.type !== NostrPrefix.Profile && link.type !== NostrPrefix.PublicKey) {
      throw new Error("Cannot follow this type of link");
    }

    const tag = link.toEventTag();
    if (tag && this.#contacts) {
      this.#contacts.add(tag);
      if (autoCommit) {
        await this.saveContacts();
      }
    } else if (!tag) {
      throw new Error("Invalid link");
    }
  }

  async unfollow(link: NostrLink, autoCommit = false) {
    this.#checkInit();
    if (link.type !== NostrPrefix.Profile && link.type !== NostrPrefix.PublicKey) {
      throw new Error("Cannot follow this type of link");
    }

    const tag = link.toEventTag();
    if (tag && this.#contacts) {
      this.#contacts.remove(tag);
      if (autoCommit) {
        await this.saveContacts();
      }
    } else if (!tag) {
      throw new Error("Invalid link");
    }
  }

  async replaceFollows(links: Array<NostrLink>, autoCommit = false) {
    this.#checkInit();
    if (links.some(link => link.type !== NostrPrefix.Profile && link.type !== NostrPrefix.PublicKey)) {
      throw new Error("Cannot follow this type of link");
    }

    if (this.#contacts) {
      const tags = removeUndefined(links.map(link => link.toEventTag()));
      this.#contacts.replace(tags);
      if (autoCommit) {
        await this.saveContacts();
      }
    }
  }

  /**
   * Manually save contact list changes
   *
   * used with `autocommit = false`
   */
  async saveContacts() {
    this.#checkInit();
    const content = JSON.stringify(this.#relaysObject());
    await this.#contacts?.persist(this.#signer!, this.#system!, content);
  }

  async addRelay(addr: string, settings: RelaySettings, autoCommit = false) {
    this.#checkInit();

    const tag = settingsToRelayTag({
      url: addr,
      settings,
    });
    if (tag && this.#relays) {
      this.#relays.add(tag);
      if (autoCommit) {
        await this.saveRelays();
      }
    } else if (!tag) {
      throw new Error("Invalid relay options");
    }
  }

  async removeRelay(addr: string, autoCommit = false) {
    this.#checkInit();

    const url = sanitizeRelayUrl(addr);
    if (url && this.#relays) {
      this.#relays.remove(["r", url]);
      if (autoCommit) {
        await this.saveRelays();
      }
    } else if (!url) {
      throw new Error("Invalid relay options");
    }
  }

  async updateRelay(addr: string, settings: RelaySettings, autoCommit = false) {
    this.#checkInit();

    const tag = settingsToRelayTag({
      url: addr,
      settings,
    });
    const url = sanitizeRelayUrl(addr);
    if (url && tag && this.#relays) {
      this.#relays.update(tag);
      if (autoCommit) {
        await this.saveRelays();
      }
    } else if (!url && !tag) {
      throw new Error("Invalid relay options");
    }
  }

  /**
   * Manually save relays
   *
   * used with `autocommit = false`
   */
  async saveRelays() {
    this.#checkInit();
    await this.#relays?.persist(this.#signer!, this.#system!);
  }

  async setAppData(data: TAppData) {
    this.#checkInit();
    if (!this.#appdata) {
      throw new Error("Not using appdata, please use options when constructing this class");
    }

    await this.#appdata.updateJson(data, this.#signer!, this.#system!);
  }

  /**
   * Add an item to the list
   * @param kind List kind
   * @param link Tag to save
   * @param autoCommit Save after adding
   * @param encrypted Tag is private and should be encrypted in the content
   */
  async addToList(
    kind: EventKind,
    links: ToNostrEventTag | Array<ToNostrEventTag>,
    autoCommit = false,
    encrypted = false,
  ) {
    this.checkIsStandardList(kind);
    this.#checkInit();
    const list = this.#standardLists?.get(kind);
    const tags = removeUndefined(Array.isArray(links) ? links.map(a => a.toEventTag()) : [links.toEventTag()]);
    if (list && tags.length > 0) {
      list.add(tags, encrypted);
      if (autoCommit) {
        await this.saveList(kind);
      }
    }
  }

  /**
   * Remove an item to the list
   * @param kind List kind
   * @param link Tag to save
   * @param autoCommit Save after adding
   * @param encrypted Tag is private and should be encrypted in the content
   */
  async removeFromList(
    kind: EventKind,
    links: ToNostrEventTag | Array<ToNostrEventTag>,
    autoCommit = false,
    encrypted = false,
  ) {
    this.checkIsStandardList(kind);
    this.#checkInit();
    const list = this.#standardLists?.get(kind);
    const tags = removeUndefined(Array.isArray(links) ? links.map(a => a.toEventTag()) : [links.toEventTag()]);
    if (list && tags.length > 0) {
      list.remove(tags, encrypted);
      if (autoCommit) {
        await this.saveList(kind);
      }
    }
  }

  /**
   * Manuall save list changes
   *
   * used with `autocommit = false`
   */
  async saveList(kind: EventKind, content?: string) {
    const list = this.#standardLists?.get(kind);
    await list?.persist(this.#signer!, this.#system!, content);
  }

  async mute(link: NostrLink, autoCommit = false) {
    await this.addToList(EventKind.MuteList, link, autoCommit, true);
  }

  async unmute(link: NostrLink, autoCommit = false) {
    await this.removeFromList(EventKind.MuteList, link, autoCommit, true);
  }

  isOnList(kind: EventKind, link: ToNostrEventTag) {
    const list = this.#standardLists?.get(kind);
    const tag = link.toEventTag();
    if (list && tag) {
      return list.tags.some(a => a[0] === tag[0] && a[1] === tag[1]);
    }
    return false;
  }

  getList(kind: EventKind): Array<ToNostrEventTag> {
    const list = this.#standardLists?.get(kind);
    return NostrLink.fromAllTags(list?.tags ?? []);
  }

  serialize(): UserStateObject<TAppData> {
    return {
      profile: this.profile,
      relays: this.relays,
      follows: this.follows,
      appdata: this.appdata,
    };
  }

  checkIsStandardList(kind: EventKind) {
    if (!(kind >= 10_000 && kind < 20_000)) {
      throw new Error("Not a standard list");
    }
    if (this.#standardLists?.has(kind) === false) {
      const list = new DiffSyncTags(new NostrLink(NostrPrefix.Event, this.pubkey, kind, this.pubkey), true);
      list.on("change", () => this.emit("change", UserStateChangeType.GenericList));
      this.#standardLists?.set(kind, list);
    }
  }

  #checkInit() {
    if (this.#signer === undefined || this.#system === undefined) {
      throw new Error("Please call init() first");
    }
  }

  #relaysObject() {
    return Object.fromEntries(this.relays?.map(a => [a.url, a.settings]) ?? []) as Record<string, RelaySettings>;
  }
}
