import { unixNow } from "@snort/shared";
import { useEffect, useState } from "react";

interface CachedObj<T> {
  cached: number;
  object: T;
  error?: string;
}

function formatKey(key: string): string {
  return `useCached:${key}`;
}

function loadData<T>(key: string | undefined): CachedObj<T> | undefined {
  if (!key) return;
  const k = formatKey(key);
  const raw = window.localStorage.getItem(k);
  try {
    const obj: CachedObj<T> | undefined = JSON.parse(raw || "");
    return obj;
  } catch {
    window.localStorage.removeItem(k);
  }
}

// cached async loader calls
const CallMap = new Map<string, Promise<any>>();

async function storeObj<T>(key: string | undefined, loader: () => Promise<T>): Promise<CachedObj<T> | undefined> {
  if (!key) return;
  let cachedCall = CallMap.get(key);
  if (!cachedCall) {
    cachedCall = loader();
    CallMap.set(key, cachedCall);
  }
  const newData = await cachedCall;
  CallMap.delete(key);
  console.debug(CallMap);
  const obj = {
    cached: unixNow(),
    object: newData,
  } as CachedObj<T>;
  window.localStorage.setItem(formatKey(key), JSON.stringify(obj));
  return obj;
}

/**
 * Simple cached hook backed by localStorage
 * @param key The key used to identify this cached object, use undefined for NOOP
 * @param loader Loader function to get the latest data
 * @param expires Relative expire time in seconds
 * @param cacheError How long to cache the error response
 * @returns
 */
export function useCached<T>(key: string | undefined, loader: () => Promise<T>, expires?: number, cacheError?: number) {
  const initData = loadData<T>(key);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(initData?.error ? new Error(initData?.error) : undefined);
  const [data, setData] = useState<CachedObj<T> | undefined>(initData);

  if (expires === undefined) {
    expires = 120;
  }

  async function loadNow() {
    setLoading(true);
    storeObj<T>(key, loader)
      .then(setData)
      .catch(e => {
        if (e instanceof Error) {
          setError(e);
        } else {
          setError(new Error(e.toString()));
        }
        const cacheFor = cacheError ?? expires;
        // save an empty cache object on error
        if (cacheFor && cacheFor > 0 && key) {
          const obj = {
            cached: unixNow(),
            error: e instanceof Error ? e.message : e.toString(),
          } as CachedObj<T>;
          window.localStorage.setItem(formatKey(key), JSON.stringify(obj));
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!key) return;
    if (loading) return;

    // if key was undefined before try to load data now
    const cached = loadData<T>(key);
    if (cached?.cached !== data?.cached) {
      setData(cached);
      if (cached?.error) {
        setError(new Error(cached.error));
      }
    }
    const now = unixNow();
    if (cached === undefined || cached.cached < now - expires) {
      loadNow();
    }
  }, [key, loading, error, data, loader, expires]);

  return {
    data: data?.object,
    loading,
    error,
    reloadNow: () => loadNow(),
  };
}
