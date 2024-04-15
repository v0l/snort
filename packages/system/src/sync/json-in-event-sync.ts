import { SafeSync } from "./safe-sync";
import { HasId } from ".";
import { EventExt, EventSigner, NostrEvent, NostrLink, SystemInterface } from "..";
import debug from "debug";
import EventEmitter from "eventemitter3";
import { unixNow } from "@snort/shared";

export interface JsonSyncEvents {
  change: () => void;
}

export class JsonEventSync<T extends HasId> extends EventEmitter<JsonSyncEvents> {
  #log = debug("JsonEventSync");
  #sync: SafeSync;
  #json: T;

  constructor(
    initValue: T,
    readonly encrypt: boolean,
  ) {
    super();
    this.#sync = new SafeSync();
    this.#json = initValue;

    this.#sync.on("change", () => this.emit("change"));
  }

  get json(): Readonly<T> {
    const ret = { ...this.#json };
    return Object.freeze(ret);
  }

  async sync(link: NostrLink, signer: EventSigner, system: SystemInterface) {
    const res = await this.#sync.sync(link, system);
    this.#log("Sync result %O", res);
    if (res) {
      if (this.encrypt) {
        this.#json = JSON.parse(await signer.nip4Decrypt(res.content, await signer.getPubKey())) as T;
      } else {
        this.#json = JSON.parse(res.content) as T;
      }
    }
  }

  /**
   * Update the json content in the event
   * @param val
   * @param signer
   */
  async updateJson(val: T, signer: EventSigner, system: SystemInterface) {
    this.#log("Updating: %O", val);
    const next = this.#sync.value ? ({ ...this.#sync.value } as NostrEvent) : undefined;
    if (!next) {
      throw new Error("Cannot update with no previous value");
    }

    next.content = JSON.stringify(val);
    next.created_at = unixNow();

    const prevTag = next.tags.find(a => a[0] === "previous");
    if (prevTag) {
      prevTag[1] = next.id;
    } else {
      next.tags.push(["previous", next.id]);
    }
    if (this.encrypt) {
      next.content = await signer.nip4Encrypt(next.content, await signer.getPubKey());
    }
    next.id = EventExt.createId(next);
    const signed = await signer.sign(next);

    await this.#sync.update(signed, system);
    this.#json = val;
    this.#json.id = next.id;
  }
}
