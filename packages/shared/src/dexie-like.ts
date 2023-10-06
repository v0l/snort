/**
 * Dexie proxy type
 */
export abstract class DexieLike {
  constructor(name: string) {}
  version(n: number) {
    return {
      stores(schema: object) {},
    };
  }
}

export type DexieIndexableTypePart =
  | string
  | number
  | Date
  | ArrayBuffer
  | ArrayBufferView
  | DataView
  | Array<Array<void>>;
export type DexieIndexableTypeArray = Array<DexieIndexableTypePart>;
export type DexieIndexableTypeArrayReadonly = ReadonlyArray<DexieIndexableTypePart>;
export type DexieIndexableType = DexieIndexableTypePart | DexieIndexableTypeArrayReadonly;

export interface DexiePromiseExtended<T = any> extends Promise<T> {
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null,
  ): DexiePromiseExtended<TResult1 | TResult2>;
  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null,
  ): DexiePromiseExtended<T | TResult>;
  catch<TResult = never>(
    ErrorConstructor: Function,
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null,
  ): DexiePromiseExtended<T | TResult>;
  catch<TResult = never>(
    errorName: string,
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null,
  ): DexiePromiseExtended<T | TResult>;
  finally<U>(onFinally?: () => U | PromiseLike<U>): DexiePromiseExtended<T>;
  timeout(ms: number, msg?: string): DexiePromiseExtended<T>;
}

/**
 * Dexie Table<T> like structure
 */
export interface DexieTableLike<T = any, TKey = DexieIndexableType> {
  toCollection(): {
    get primaryKeys(): {
      (): DexiePromiseExtended<Array<TKey>>;
      <R>(thenShortcut: DexieThenShortcut<Array<TKey>, R>): DexiePromiseExtended<R>;
    };
  };
  get(key: TKey): DexiePromiseExtended<T | undefined>;
  bulkGet(keys: Array<TKey>): DexiePromiseExtended<Array<T | undefined>>;
  put(item: T, key?: TKey): DexiePromiseExtended<TKey>;
  bulkPut(
    items: readonly T[],
    keys?: DexieIndexableTypeArrayReadonly,
    options?: {
      allKeys: boolean;
    },
  ): DexiePromiseExtended<TKey>;
  clear(): DexiePromiseExtended<void>;
  where(index: string | string[]): DexieWhereClause<T, TKey>;
  toArray(): DexiePromiseExtended<Array<T>>;
  orderBy(index: string | string[]): DexieCollection<T, TKey>;
}

export interface DexieCollection<T = any, TKey = DexieIndexableType> {
  first(): DexiePromiseExtended<T | undefined>;
  or(indexOrPrimayKey: string): DexieWhereClause<T, TKey>;
  toArray(): DexiePromiseExtended<Array<T>>;
  reverse(): DexieCollection<T, TKey>;
  sortBy(keyPath: string): DexiePromiseExtended<T[]>;
  limit(n: number): DexieCollection<T, TKey>;
  delete(): DexiePromiseExtended<number>;
}

export interface DexieWhereClause<T = any, TKey = DexieIndexableType> {
  startsWithIgnoreCase(key: string): DexieCollection<T, TKey>;
  below(key: any): DexieCollection<T, TKey>;
  between(lower: any, upper: any, includeLower?: boolean, includeUpper?: boolean): DexieCollection<T, TKey>;
}

export type DexieThenShortcut<T, TResult> = (value: T) => TResult | PromiseLike<TResult>;
