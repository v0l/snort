import { LoginStore } from "Login";
import { useSyncExternalStore } from "react";

export default function useLogin() {
  return useSyncExternalStore(
    s => LoginStore.hook(s),
    () => LoginStore.snapshot()
  );
}
