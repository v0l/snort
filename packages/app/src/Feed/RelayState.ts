import { System } from "index";

export default function useRelayState(addr: string) {
  const c = System.Sockets.find(a => a.address === addr);
  return c;
}
