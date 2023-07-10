import useLogin from "Hooks/useLogin";

export default function useEventPublisher() {
  const { publisher } = useLogin();
  return publisher;
}
