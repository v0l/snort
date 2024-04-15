import EventEmitter from "eventemitter3";
import { EventExt, EventType, NostrEvent, NostrLink, RequestBuilder, SystemInterface } from "..";

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
  #base: NostrEvent | undefined;

  get value() {
    return this.#base;
  }

  /**
   * Fetch the latest version
   * @param link A link to the kind
   */
  async sync(link: NostrLink, system: SystemInterface) {
    if (link.kind === undefined) {
      throw new Error("Kind must be set");
    }

    const rb = new RequestBuilder("sync");
    const f = rb.withFilter().link(link);
    if (this.#base) {
      f.since(this.#base.created_at);
    }
    const results = await system.Fetch(rb);
    const res = results.find(a => link.matchesEvent(a));
    if (res && res.created_at > (this.#base?.created_at ?? 0)) {
      this.#base = res;
      this.emit("change");
    }
    return this.#base;
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
   * @param ev
   */
  async update(ev: NostrEvent, system: SystemInterface) {
    console.debug(this.#base, ev);
    this.#checkForUpdate(ev, true);

    const link = NostrLink.fromEvent(ev);
    // always attempt to get a newer version before broadcasting
    await this.sync(link, system);
    this.#checkForUpdate(ev, true);

    system.BroadcastEvent(ev);
    this.#base = ev;
    this.emit("change");
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
    const link = NostrLink.fromEvent(ev);
    if (!link.matchesEvent(this.#base)) {
      throw new Error("Invalid event");
    }
  }
}
