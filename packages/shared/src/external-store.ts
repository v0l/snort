export type HookFn<TSnapshot> = (e?: TSnapshot) => void;

export interface HookFilter<TSnapshot> {
  fn: HookFn<TSnapshot>;
}

/**
 * Simple React hookable store with manual change notifications
 */
export abstract class ExternalStore<TSnapshot> {
  #hooks: Array<HookFilter<TSnapshot>> = [];
  #snapshot: Readonly<TSnapshot> = {} as Readonly<TSnapshot>;
  #changed = true;

  hook(fn: HookFn<TSnapshot>) {
    this.#hooks.push({
      fn,
    });
    return () => {
      const idx = this.#hooks.findIndex(a => a.fn === fn);
      if (idx >= 0) {
        this.#hooks.splice(idx, 1);
      }
    };
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
    if (this.#hooks.length > 0) {
      this.#hooks.forEach(h => h.fn(sn));
    }
  }

  abstract takeSnapshot(p?: any): TSnapshot;
}
