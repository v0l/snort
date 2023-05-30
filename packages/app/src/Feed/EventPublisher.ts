import { useMemo } from "react";
import useLogin from "Hooks/useLogin";
import { EventPublisher } from "System/EventPublisher";
import { System } from "index";

export default function useEventPublisher() {
  const { publicKey, privateKey } = useLogin();
  return useMemo(() => {
    if (publicKey) {
      return new EventPublisher(System, publicKey, privateKey);
    }
  }, [publicKey, privateKey]);
}
