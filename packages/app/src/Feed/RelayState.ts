import { useContext } from "react";
import { SnortContext } from "@snort/system-react";

export default function useRelayState(addr: string) {
  const system = useContext(SnortContext);
  const c = system.Sockets.find(a => a.address === addr);
  return c;
}
