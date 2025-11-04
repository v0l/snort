import { unixNow } from "@snort/shared";
import { useEffect, useState } from "react";

interface CachedObj<T> {
  cached: number;
  object: T;
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

async function storeObj<T>(key: string | undefined, loader: () => Promise<T>): Promise<CachedObj<T> | undefined> {
  if (!key) return;
  const k = formatKey(key);
  const newData = await loader();
  const obj = {
    cached: unixNow(),
    object: newData,
  } as CachedObj<T>;
  window.localStorage.setItem(k, JSON.stringify(obj));
  return obj;
}

/**
 * Simple cached hook backed by localStorage
 * @param key The key used to identify this cached object, use undefined for NOOP
 * @param loader Loader function to get the latest data
 * @param expires Relative expire time in seconds
 * @returns
 */
export function useCached<T>(key: string | undefined, loader: () => Promise<T>, expires?: number) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error>();
  const [data, setData] = useState<CachedObj<T> | undefined>(loadData<T>(key));

  async function loadNow() {
    storeObj<T>(key, loader)
      .then(setData)
      .catch(e => {
        if (e instanceof Error) {
          setError(e);
        } else {
          setError(new Error(e.toString()));
        }
      });
  }

  useEffect(() => {
    if (!key) return;
    if (loading) return;
    if (error) return;

    // if key was undefined before try to load data now
    const cached = loadData<T>(key);
    if (cached?.cached !== data?.cached) {
      setData(cached);
    }
    const now = unixNow();
    if (cached === undefined || cached.cached < now - (expires ?? 120)) {
      setLoading(true);
      loadNow().finally(() => setLoading(false));
    }
  }, [key, loading, error, data, loader, expires]);

  return {
    data: data?.object,
    loading,
    error,
    reloadNow: () => loadNow(),
  };
}
