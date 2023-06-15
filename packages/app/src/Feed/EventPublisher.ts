import { useMemo } from "react";
import useLogin from "Hooks/useLogin";
import { EventPublisher } from "@snort/system";

export default function useEventPublisher() {
  const { publicKey, privateKey } = useLogin();
  return useMemo(() => {
    if (publicKey) {
      return new EventPublisher(publicKey, privateKey);
    }
  }, [publicKey, privateKey]);
}
