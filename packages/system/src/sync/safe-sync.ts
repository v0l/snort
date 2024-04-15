import EventEmitter from "eventemitter3";
import { EventExt, EventSigner, EventType, NostrEvent, NostrLink, RequestBuilder, SystemInterface } from "..";
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

  get value() {
    return this.#base ? Object.freeze({ ...this.#base }) : undefined;
  }

  get didSync() {
    return this.#didSync;
  }

  /**
   * Fetch the latest version
   * @param link A link to the kind
   */
  async sync(link: NostrLink, system: SystemInterface) {
    if (link.kind === undefined || link.author === undefined) {
      throw new Error("Kind must be set");
    }

    return await this.#sync(link, system);
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
  async update(next: NostrEvent, signer: EventSigner, system: SystemInterface, mustExist?: boolean) {
    next.id = "";
    next.sig = "";
    console.debug(this.#base, next);

    const signed = await this.#signEvent(next, signer);
    const link = NostrLink.fromEvent(signed);
    // always attempt to get a newer version before broadcasting
    await this.#sync(link, system);
    this.#checkForUpdate(signed, mustExist ?? true);

    system.BroadcastEvent(signed);
    this.#base = signed;
    this.emit("change");
  }

  async #signEvent(next: NostrEvent, signer: EventSigner) {
    next.created_at = unixNow();
    if (this.#base) {
      const prevTag = next.tags.find(a => a[0] === "previous");
      if (prevTag) {
        prevTag[1] = this.#base.id;
      } else {
        next.tags.push(["previous", this.#base.id]);
      }
    }
    next.id = EventExt.createId(next);
    return await signer.sign(next);
  }

  async #sync(link: NostrLink, system: SystemInterface) {
    const rb = new RequestBuilder(`sync:${link.encode()}`);
    const f = rb.withFilter().link(link);
    if (this.#base) {
      f.since(this.#base.created_at);
    }
    const results = await system.Fetch(rb);
    const res = results.find(a => link.matchesEvent(a));
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
    if (
      EventExt.getType(ev.kind) !== EventType.Replaceable &&
      EventExt.getType(ev.kind) !== EventType.ParameterizedReplaceable
    ) {
      throw new Error("Not a replacable event kind");
    }
    if (this.#base.created_at >= ev.created_at) {
      throw new Error("Same version, cannot update");
    }
  }
}
