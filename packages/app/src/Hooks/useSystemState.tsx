import { useSyncExternalStore } from "react";
import { System, SystemSnapshot } from "System";

export default function useSystemState() {
  return useSyncExternalStore<SystemSnapshot>(
    cb => System.hook(cb),
    () => System.getSnapshot()
  );
}
