import { useContext } from "react";
import { SnortContext } from "@snort/system-react";
import useLogin from "@/Hooks/useLogin";
import { LoginStore, createPublisher, sessionNeedsPin } from "@/Login";

export default function useEventPublisher() {
  const login = useLogin();
  const system = useContext(SnortContext);

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
