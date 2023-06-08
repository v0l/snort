import { useSyncExternalStore } from "react";
import { SystemSnapshot } from "@snort/system";
import { System } from "index";

export default function useSystemState() {
  return useSyncExternalStore<SystemSnapshot>(
    cb => System.hook(cb),
    () => System.snapshot()
  );
}
