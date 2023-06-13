import { useMemo } from "react";
import useLogin from "Hooks/useLogin";
import { EventPublisher } from "@snort/system";
import { System } from "index";

export default function useEventPublisher() {
  const { publicKey, privateKey } = useLogin();
  return useMemo(() => {
    if (publicKey) {
      return new EventPublisher(System, publicKey, privateKey);
    }
  }, [publicKey, privateKey]);
}
