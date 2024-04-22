import useLogin from "./useLogin";

export default function useRelays() {
  const relays = useLogin(s => s.state.relays);
  return relays ? Object.fromEntries(relays.map(a => [a.url, a.settings])) : CONFIG.defaultRelays;
}
