import { SnortContext } from "@snort/system-react";
import { use } from "react";

import useLogin from "@/Hooks/useLogin";
import { createPublisher, LoginStore, sessionNeedsPin } from "@/Utils/Login";

export default function useEventPublisher() {
  const login = useLogin();
  const system = use(SnortContext);

  let existing = LoginStore.getPublisher(login.id);

  if (login.publicKey && !existing && !sessionNeedsPin(login)) {
    existing = createPublisher(login);
    if (existing) {
      LoginStore.setPublisher(login.id, existing);
    }
  }
  return {
    publisher: existing,
    system,
  };
}
