import { SafeSync, SafeSyncEvents } from "./safe-sync";
import { decryptSigner, EventBuilder, EventSigner, NostrEvent, NostrLink, SystemInterface } from "..";
import debug from "debug";
import EventEmitter from "eventemitter3";

export class JsonEventSync<T> extends EventEmitter<SafeSyncEvents> {
  #log = debug("JsonEventSync");
  #sync: SafeSync;
  #json: T;

  constructor(
    initValue: T,
    readonly link: NostrLink,
    readonly encrypt: boolean,
  ) {
    super();
    this.#sync = new SafeSync(link);
    this.#json = initValue;

    this.#sync.on("change", () => this.emit("change"));
  }

  get json(): Readonly<T> {
    const ret = { ...this.#json };
    return Object.freeze(ret);
  }

  /**
   * Check if there are pending changes (local value differs from synced value)
   */
  get hasPendingChanges(): boolean {
    if (!this.#sync.value) return false;

    try {
      const syncedJson = JSON.parse(this.#sync.value.content);
      return JSON.stringify(syncedJson) !== JSON.stringify(this.#json);
    } catch {
      return false;
    }
  }

  /**
   * Update the local JSON value without saving to Nostr
   * Call persist() separately to save changes
   */
  setJson(val: T) {
    this.#json = val;
    this.emit("change");
  }

  async sync(signer: EventSigner | undefined, system: SystemInterface) {
    const res = await this.#sync.sync(system);
    this.#log("Sync result %O", res);
    if (res) {
      if (this.encrypt) {
        if (!signer) return;
        this.#json = JSON.parse(await decryptSigner(res.content, signer)) as T;
      } else {
        this.#json = JSON.parse(res.content) as T;
      }
    }
    return res;
  }

  /**
   * Persist the current local JSON state to Nostr
   */
  async persist(signer: EventSigner, system: SystemInterface) {
    this.#log("Persisting: %O", this.#json);
    let next = this.#sync.value ? ({ ...this.#sync.value } as NostrEvent) : undefined;
    let isNew = false;
    if (!next) {
      // create a new event if we already did sync and still undefined
      if (this.#sync.didSync) {
        const eb = new EventBuilder();
        eb.fromLink(this.link);
        next = eb.build();
        isNew = true;
      } else {
        throw new Error("Cannot persist with no previous value");
      }
    }

    next.content = JSON.stringify(this.#json);
    if (this.encrypt) {
      next.content = await signer.nip44Encrypt(next.content, await signer.getPubKey());
    }

    await this.#sync.update(next, signer, system, !isNew);
  }

  /**
   * Update the json content and immediately save to Nostr
   * @deprecated Use setJson() + persist() for better control
   */
  async updateJson(val: T, signer: EventSigner, system: SystemInterface) {
    this.setJson(val);
    await this.persist(signer, system);
  }
}
