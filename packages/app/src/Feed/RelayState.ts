import { SnortContext } from "@snort/system-react";
import { use } from "react";

export default function useRelayState(addr: string) {
  const system = use(SnortContext);
  const c = system.pool.getConnection(addr);
  return c;
}
