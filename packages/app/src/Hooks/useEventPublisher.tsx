import useLogin from "Hooks/useLogin";
import { LoginStore, createPublisher, sessionNeedsPin } from "Login";
import { DefaultPowWorker } from "index";

export default function useEventPublisher() {
  const login = useLogin();

  let existing = LoginStore.getPublisher(login.id);

  if (login.publicKey && !existing && !sessionNeedsPin(login)) {
    existing = createPublisher(login);
    if (existing) {
      if (login.preferences.pow) {
        existing.pow(login.preferences.pow, DefaultPowWorker);
      }
      LoginStore.setPublisher(login.id, existing);
    }
  }

  return existing;
}
