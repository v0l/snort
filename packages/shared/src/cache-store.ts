/**
 * Simple key-value store interface for caching
 * Can be implemented with IndexedDB, localStorage, in-memory Map, or any other storage backend
 */
export interface CacheStore<T = any> {
  /**
   * Get all keys in the store
   */
  keys(): Promise<Array<string>>;

  /**
   * Get a single item by key
   */
  get(key: string): Promise<T | undefined>;

  /**
   * Get multiple items by keys
   */
  bulkGet(keys: Array<string>): Promise<Array<T | undefined>>;

  /**
   * Store a single item
   */
  put(item: T): Promise<void>;

  /**
   * Store multiple items
   */
  bulkPut(items: readonly T[]): Promise<void>;

  /**
   * Clear all items from the store
   */
  clear(): Promise<void>;
}
