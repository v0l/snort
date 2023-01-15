import { useSyncExternalStore } from "react";
import { System } from "../nostr/System";
import { CustomHook } from "../nostr/Connection";

const noop = (f: CustomHook) => { return () => { }; };
const noopState = () => { };

export default function useRelayState(addr: string) {
    let c = System.Sockets.get(addr);
    return useSyncExternalStore(c?.StatusHook.bind(c) ?? noop, c?.GetState.bind(c) ?? noopState);
}