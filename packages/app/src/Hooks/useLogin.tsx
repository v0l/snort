import { LoginSession, LoginStore } from "Login";
import { useSyncExternalStore } from "react";
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/with-selector";

export default function useLogin<T = LoginSession>(selector?: (v: LoginSession) => T) {
  if (selector) {
    return useSyncExternalStoreWithSelector(
      s => LoginStore.hook(s),
      () => LoginStore.snapshot(),
      undefined,
      selector,
    );
  } else {
    return useSyncExternalStore<T>(
      s => LoginStore.hook(s),
      () => LoginStore.snapshot() as T,
    );
  }
}
