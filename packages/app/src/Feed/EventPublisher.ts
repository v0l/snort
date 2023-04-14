import { useMemo } from "react";
import useLogin from "Hooks/useLogin";
import { EventPublisher } from "System/EventPublisher";

export default function useEventPublisher() {
  const { publicKey, privateKey } = useLogin();
  return useMemo(() => {
    if (publicKey) {
      return new EventPublisher(publicKey, privateKey);
    }
  }, [publicKey, privateKey]);
}
