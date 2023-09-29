import useLogin from "Hooks/useLogin";
import { LoginStore, createPublisher, sessionNeedsPin } from "Login";

export default function useEventPublisher() {
  const login = useLogin();

  let existing = LoginStore.getPublisher(login.id);

  if (login.publicKey && !existing && !sessionNeedsPin(login)) {
    existing = createPublisher(login);
    if (existing) {
      LoginStore.setPublisher(login.id, existing);
    }
  }
  return existing;
}
