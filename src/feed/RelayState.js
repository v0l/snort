import { useSyncExternalStore } from "react";
import { System } from "..";

const noop = () => {};

export default function useRelayState(addr) {
    let c = System.Sockets[addr];
    return useSyncExternalStore(c?.StatusHook.bind(c) ?? noop, c?.GetState.bind(c) ?? noop);
}