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

  #signer?: EventSigner;
  #system?: SystemInterface;

  // state object will be used in the getters as a fallback value when not yet synced
  #stateObj?: UserStateObject<TAppData>;
  #initPromise?: Promise<void>;
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
    return this.#initPromise !== undefined;
  }

  destroy() {
    this.#log("Shutdown");
    this.removeAllListeners();
  }

  /**
   * Initialize and sync user state from Nostr relays.
   * This method is idempotent - calling it multiple times will only initialize once.
   */
  async init(signer: EventSigner | undefined, system: SystemInterface) {
    if (this.#initPromise) {
      return this.#initPromise;
    }

    this.#signer = signer;
    this.#system = system;

    this.#initPromise = this.#performInit(signer, system);
    return this.#initPromise;
  }

  async #performInit(signer: EventSigner | undefined, system: SystemInterface) {
    this.#log("Init start");
    const tasks = [
      this.#profile?.sync(signer, system).catch(e => this.#log("Failed to sync profile: %O", e)),
      this.#contacts?.sync(signer, system).catch(e => this.#log("Failed to sync contacts: %O", e)),
      this.#relays?.sync(signer, system).catch(e => this.#log("Failed to sync relays: %O", e)),
    ];
    if (this.#appdata) {
      tasks.push(this.#appdata.sync(signer, system).catch(e => this.#log("Failed to sync appdata: %O", e)));
    }
    if (this.#standardLists) {
      for (const list of this.#standardLists.values()) {
        tasks.push(list.sync(signer, system).catch(e => this.#log("Failed to sync list %O: ", list.link, e)));
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
        this.#addRelay(r.url, r.settings);
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
   * Get the number of pending changes that haven't been saved to Nostr yet
   */
  get pendingChanges() {
    let count = 0;

    // Check contacts for pending changes
    if (this.#contacts) {
      // DiffSyncTags stores changes in private #changes array, but we can check if tags differ from value
      // If there's a value (synced event) and tags differ from value.tags, there are pending changes
      const syncedTags = this.#contacts.value?.tags ?? [];
      const currentTags = this.#contacts.tags;
      if (JSON.stringify(syncedTags) !== JSON.stringify(currentTags)) {
        count++;
      }
    }

    // Check relays for pending changes
    if (this.#relays) {
      const syncedTags = this.#relays.value?.tags ?? [];
      const currentTags = this.#relays.tags;
      if (JSON.stringify(syncedTags) !== JSON.stringify(currentTags)) {
        count++;
      }
    }

    // Check app data for pending changes
    if (this.#appdata && this.#appdata.hasPendingChanges) {
      count++;
    }

    // Check all standard lists for pending changes
    if (this.#standardLists) {
      for (const list of this.#standardLists.values()) {
        const syncedTags = list.value?.tags ?? [];
        const currentTags = list.tags;
        let syncedEncrypted = list.value?.content ?? "";
        const currentEncrypted = list.encryptedTags;

        try {
          syncedEncrypted = JSON.stringify(JSON.parse(syncedEncrypted));
        } catch {
          //ignore
          syncedEncrypted = JSON.stringify(currentEncrypted);
        }

        // Check both regular tags and encrypted content
        if (
          JSON.stringify(syncedTags) !== JSON.stringify(currentTags) ||
          syncedEncrypted !== JSON.stringify(currentEncrypted)
        ) {
          count++;
        }
      }
    }

    return count;
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

  /**
   * Follow a user
   */
  follow(link: NostrLink) {
    this.#ensureInit();
    if (link.type !== NostrPrefix.Profile && link.type !== NostrPrefix.PublicKey) {
      throw new Error("Cannot follow this type of link");
    }

    const tag = link.toEventTag();
    if (tag && this.#contacts) {
      this.#contacts.add(tag);
    } else if (!tag) {
      throw new Error("Invalid link");
    }
  }

  /**
   * Unfollow a user
   */
  unfollow(link: NostrLink) {
    this.#ensureInit();
    if (link.type !== NostrPrefix.Profile && link.type !== NostrPrefix.PublicKey) {
      throw new Error("Cannot follow this type of link");
    }

    const tag = link.toEventTag();
    if (tag && this.#contacts) {
      this.#contacts.remove(tag);
    } else if (!tag) {
      throw new Error("Invalid link");
    }
  }

  /**
   * Replace the entire follow list
   */
  replaceFollows(links: Array<NostrLink>) {
    this.#ensureInit();
    if (links.some(link => link.type !== NostrPrefix.Profile && link.type !== NostrPrefix.PublicKey)) {
      throw new Error("Cannot follow this type of link");
    }

    if (this.#contacts) {
      const tags = removeUndefined(links.map(link => link.toEventTag()));
      this.#contacts.replace(tags);
    }
  }

  /**
   * Save all pending contact list changes to Nostr
   */
  async saveContacts() {
    this.#ensureInit();
    const content = JSON.stringify(this.#relaysObject());
    await this.#contacts?.persist(this.#signer!, this.#system!, content);
  }

  /**
   * Save all pending changes (contacts + relays + app data + all lists) to Nostr
   * This is a convenience method for saving everything at once
   */
  async saveAll() {
    this.#ensureInit();
    const tasks: Promise<void>[] = [];

    // Save contacts if there are changes
    if (this.#contacts) {
      const content = JSON.stringify(this.#relaysObject());
      tasks.push(this.#contacts.persist(this.#signer!, this.#system!, content));
    }

    // Save relays if there are changes
    if (this.#relays) {
      tasks.push(this.#relays.persist(this.#signer!, this.#system!));
    }

    // Save app data if there are changes
    if (this.#appdata && this.#appdata.hasPendingChanges) {
      tasks.push(this.#appdata.persist(this.#signer!, this.#system!));
    }

    // Save all standard lists
    if (this.#standardLists) {
      for (const list of this.#standardLists.values()) {
        tasks.push(list.persist(this.#signer!, this.#system!));
      }
    }

    await Promise.all(tasks);
  }

  /**
   * Add a relay to the relay list
   */
  addRelay(addr: string, settings: RelaySettings) {
    this.#ensureInit();
    this.#addRelay(addr, settings);
  }

  #addRelay(addr: string, settings: RelaySettings) {
    const tag = settingsToRelayTag({
      url: addr,
      settings,
    });
    if (tag && this.#relays) {
      this.#relays.add(tag);
    } else if (!tag) {
      throw new Error("Invalid relay options");
    }
  }

  /**
   * Remove a relay from the relay list
   */
  removeRelay(addr: string) {
    this.#ensureInit();

    const url = sanitizeRelayUrl(addr);
    if (url && this.#relays) {
      this.#relays.remove(["r", url]);
    } else if (!url) {
      throw new Error("Invalid relay options");
    }
  }

  /**
   * Update relay settings
   */
  updateRelay(addr: string, settings: RelaySettings) {
    this.#ensureInit();

    const tag = settingsToRelayTag({
      url: addr,
      settings,
    });
    const url = sanitizeRelayUrl(addr);
    if (url && tag && this.#relays) {
      this.#relays.update(tag);
    } else if (!url && !tag) {
      throw new Error("Invalid relay options");
    }
  }

  /**
   * Save all pending relay changes to Nostr
   */
  async saveRelays() {
    this.#ensureInit();
    await this.#relays?.persist(this.#signer!, this.#system!);
  }

  /**
   * Update app-specific data locally without saving to Nostr
   * Call saveAppData() to persist changes
   */
  setAppData(data: TAppData) {
    if (!this.#appdata) {
      throw new Error("Not using appdata, please use options when constructing this class");
    }
    this.#appdata.setJson(data);
  }

  /**
   * Save pending app data changes to Nostr
   */
  async saveAppData() {
    this.#ensureInit();
    if (!this.#appdata) {
      throw new Error("Not using appdata, please use options when constructing this class");
    }
    await this.#appdata.persist(this.#signer!, this.#system!);
  }

  /**
   * Add an item to a list
   * @param kind List kind (must be 10000-19999 range for standard lists)
   * @param links Tag(s) to add
   * @param encrypted Whether the tag should be encrypted in the content
   */
  addToList(kind: EventKind, links: ToNostrEventTag | Array<ToNostrEventTag>, encrypted = false) {
    this.checkIsStandardList(kind);
    this.#ensureInit();
    const list = this.#standardLists?.get(kind);
    const tags = removeUndefined(Array.isArray(links) ? links.map(a => a.toEventTag()) : [links.toEventTag()]);
    if (list && tags.length > 0) {
      list.add(tags, encrypted);
    }
  }

  /**
   * Remove an item from a list
   * @param kind List kind (must be 10000-19999 range for standard lists)
   * @param links Tag(s) to remove
   * @param encrypted Whether the tag is encrypted in the content
   */
  removeFromList(kind: EventKind, links: ToNostrEventTag | Array<ToNostrEventTag>, encrypted = false) {
    this.checkIsStandardList(kind);
    this.#ensureInit();
    const list = this.#standardLists?.get(kind);
    const tags = removeUndefined(Array.isArray(links) ? links.map(a => a.toEventTag()) : [links.toEventTag()]);
    if (list && tags.length > 0) {
      list.remove(tags, encrypted);
    }
  }

  /**
   * Save pending changes to a specific list
   */
  async saveList(kind: EventKind, content?: string) {
    this.#ensureInit();
    const list = this.#standardLists?.get(kind);
    await list?.persist(this.#signer!, this.#system!, content);
  }

  /**
   * Mute a user, event, or other item (added to encrypted mute list)
   */
  mute(link: NostrLink) {
    this.addToList(EventKind.MuteList, link, true);
  }

  /**
   * Unmute a user, event, or other item (removed from encrypted mute list)
   */
  unmute(link: NostrLink) {
    this.removeFromList(EventKind.MuteList, link, true);
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

  /**
   * Ensures init has been called before performing mutations
   */
  #ensureInit() {
    if (this.#signer === undefined || this.#system === undefined) {
      throw new Error("Please call init() first before making changes");
    }
  }

  #relaysObject() {
    return Object.fromEntries(this.relays?.map(a => [a.url, a.settings]) ?? []) as Record<string, RelaySettings>;
  }
}
