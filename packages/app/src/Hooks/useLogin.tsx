import { LoginSession, LoginStore } from "@/Login";
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/with-selector";

export default function useLogin<T = LoginSession>(selector?: (v: LoginSession) => T) {
  const defaultSelector = (v: LoginSession) => v as unknown as T;

  return useSyncExternalStoreWithSelector<LoginSession, T>(
    s => LoginStore.hook(s),
    () => LoginStore.snapshot(),
    undefined,
    selector || defaultSelector,
  );
}
