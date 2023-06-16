import { useSyncExternalStore } from "react";
import { SystemSnapshot } from "@snort/system";
import { ExternalStore } from "@snort/shared";

export function useSystemState(system: ExternalStore<SystemSnapshot>) {
  return useSyncExternalStore<SystemSnapshot>(
    cb => system.hook(cb),
    () => system.snapshot()
  );
}
