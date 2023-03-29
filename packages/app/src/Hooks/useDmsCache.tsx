import { DmCache } from "Cache";
import { useSyncExternalStore } from "react";

export function useDmCache() {
  return useSyncExternalStore(
    c => DmCache.hook(c, undefined),
    () => DmCache.snapshot()
  );
}
