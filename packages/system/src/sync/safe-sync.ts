import EventEmitter from "eventemitter3";
import {
  EventExt,
  EventSigner,
  EventType,
  NostrEvent,
  NostrLink,
  NotSignedNostrEvent,
  RequestBuilder,
  SystemInterface,
} from "..";
import { unixNow } from "@snort/shared";
import debug from "debug";

export interface SafeSyncEvents {
  change: () => void;
}

/**
 * Safely sync replacable events to nostr
 *
 * Usefule for the following critical kinds:
 * 0 (Metadata)
 * 3 (Contacts)
 * 10002 (Relays)
 * 30078 (AppData)
 */
export class SafeSync extends EventEmitter<SafeSyncEvents> {
  #log = debug("SafeSync");
  #base: NostrEvent | undefined;
  #didSync = false;

  constructor(readonly link: NostrLink) {
    super();
  }

  get value() {
    return this.#base ? Object.freeze({ ...this.#base }) : undefined;
  }

  get didSync() {
    return this.#didSync;
  }

  /**
   * Fetch the latest version
   */
  async sync(system: SystemInterface) {
    if (this.link.kind === undefined || this.link.author === undefined) {
      throw new Error("Kind must be set");
    }

    return await this.#sync(system);
  }

  /**
   * Set the base value
   * @param ev
   */
  setBase(ev: NostrEvent) {
    this.#checkForUpdate(ev, false);
    this.#base = ev;
    this.emit("change");
  }

  /**
   * Publish an update for this event
   *
   * Event will be signed again inside
   * @param ev
   */
  async update(
    next: NostrEvent | NotSignedNostrEvent,
    signer: EventSigner,
    system: SystemInterface,
    mustExist?: boolean,
  ) {
    if ("sig" in next) {
      next.id = "";
      next.sig = "";
    }
    const signed = await this.#signEvent(next, signer);

    // always attempt to get a newer version before broadcasting
    await this.#sync(system);
    this.#checkForUpdate(signed, mustExist ?? true);

    await system.BroadcastEvent(signed);
    this.#base = signed;
    this.emit("change");
  }

  async #signEvent(next: NotSignedNostrEvent, signer: EventSigner) {
    const toSign = { ...next, id: "", sig: "" } as NostrEvent;
    toSign.created_at = unixNow();
    toSign.id = EventExt.createId(toSign);
    return await signer.sign(toSign);
  }

  async #sync(system: SystemInterface) {
    const rb = new RequestBuilder("sync");
    const f = rb.withFilter().link(this.link);
    if (this.#base) {
      f.since(this.#base.created_at);
    }
    const results = await system.Fetch(rb);
    const res = results.find(a => this.link.matchesEvent(a));
    this.#log("Got result %O", res);
    if (res && res.created_at > (this.#base?.created_at ?? 0)) {
      this.#base = res;
      this.emit("change");
    }
    this.#didSync = true;
    return this.#base;
  }

  #checkForUpdate(ev: NostrEvent, mustExist: boolean) {
    if (!this.#base) {
      if (mustExist) {
        throw new Error("No previous version detected");
      } else {
        return;
      }
    }
    const prevTag = ev.tags.find(a => a[0] === "previous");
    if (prevTag && prevTag[1] !== this.#base.id) {
      throw new Error("Previous tag does not match our version");
    }
    if (EventExt.getType(ev.kind) !== EventType.Replaceable && EventExt.getType(ev.kind) !== EventType.Addressable) {
      throw new Error("Not a replacable event kind");
    }
    if (this.#base.created_at >= ev.created_at) {
      throw new Error("Same version, cannot update");
    }
  }
}
