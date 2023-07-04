import { useMemo } from "react";
import useLogin from "Hooks/useLogin";
import { EventPublisher, Nip7Signer } from "@snort/system";

export default function useEventPublisher() {
  const { publicKey, privateKey } = useLogin();
  return useMemo(() => {
    if (privateKey) {
      return EventPublisher.privateKey(privateKey);
    }
    if (publicKey) {
      return new EventPublisher(new Nip7Signer(), publicKey);
    }
  }, [publicKey, privateKey]);
}
