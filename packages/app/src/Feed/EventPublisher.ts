import useLogin from "Hooks/useLogin";
import { DefaultPowWorker } from "index";

export default function useEventPublisher() {
  const { publisher, preferences } = useLogin();
  if (preferences.pow) {
    publisher?.pow(preferences.pow, DefaultPowWorker);
  }
  return publisher;
}
