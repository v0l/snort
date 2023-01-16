import { useSyncExternalStore } from "react";
import { System } from "../nostr/System";
import { CustomHook, StateSnapshot } from "../nostr/Connection";

const noop = (f: CustomHook) => { return () => { }; };
const noopState = (): StateSnapshot | undefined => {
    return undefined;
};

export default function useRelayState(addr: string) {
    let c = System.Sockets.get(addr);
    return useSyncExternalStore<StateSnapshot | undefined>(c?.StatusHook.bind(c) ?? noop, c?.GetState.bind(c) ?? noopState);
}