import { useSyncExternalStore } from "react";
import type { SystemSnapshot } from "@snort/system";
import type { ExternalStore } from "@snort/shared";

export function useSystemState(system: ExternalStore<SystemSnapshot>) {
  return useSyncExternalStore<SystemSnapshot>(
    cb => system.hook(cb),
    () => system.snapshot(),
  );
}
