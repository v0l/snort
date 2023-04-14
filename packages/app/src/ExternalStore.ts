type HookFn = () => void;

interface HookFilter {
  fn: HookFn;
}

/**
 * Simple React hookable store with manual change notifications
 */
export default abstract class ExternalStore<TSnapshot> {
  #hooks: Array<HookFilter> = [];
  #snapshot: Readonly<TSnapshot> = {} as Readonly<TSnapshot>;
  #changed = true;

  hook(fn: HookFn) {
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

  snapshot() {
    if (this.#changed) {
      this.#snapshot = this.takeSnapshot();
      this.#changed = false;
    }
    return this.#snapshot;
  }

  protected notifyChange() {
    this.#changed = true;
    this.#hooks.forEach(h => h.fn());
  }

  abstract takeSnapshot(): TSnapshot;
}
