import { useSyncExternalStore } from "react";
import { SystemSnapshot } from "System";
import { System } from "index";

export default function useSystemState() {
  return useSyncExternalStore<SystemSnapshot>(
    cb => System.hook(cb),
    () => System.snapshot()
  );
}
