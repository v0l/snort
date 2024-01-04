export default class LRUSet<T> {
  private set = new Set<T>();
  private limit: number;

  constructor(limit: number) {
    this.limit = limit;
  }

  add(item: T) {
    if (this.set.size >= this.limit) {
      this.set.delete(this.set.values().next().value);
    }
    this.set.add(item);
  }

  has(item: T) {
    return this.set.has(item);
  }

  values() {
    return this.set.values();
  }
}
