import { EventEmitter } from "eventemitter3";

interface ExternalStoreEvents {
  change: () => void;
}

/**
 * Simple hookable store with manual change notifications
 */
export abstract class ExternalStore<TSnapshot> extends EventEmitter<ExternalStoreEvents> {
  #snapshot: TSnapshot = {} as TSnapshot;
  #changed = true;

  hook(cb: () => void) {
    this.on("change", cb);
    return () => this.off("change", cb);
  }

  snapshot(p?: any) {
    if (this.#changed) {
      this.#snapshot = this.takeSnapshot(p);
      this.#changed = false;
    }
    return this.#snapshot;
  }

  protected notifyChange(sn?: TSnapshot) {
    this.#changed = true;
    this.emit("change");
  }

  abstract takeSnapshot(p?: any): TSnapshot;
}
