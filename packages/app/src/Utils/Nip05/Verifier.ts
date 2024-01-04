import { throwIfOffline } from "@snort/shared";

interface NostrJson {
  names: Record<string, string>;
}

export async function fetchNip05Pubkey(name: string, domain: string, timeout = 2_000) {
  if (!name || !domain) {
    return undefined;
  }
  try {
    throwIfOffline();
    const res = await fetch(`https://${domain}/.well-known/nostr.json?name=${encodeURIComponent(name)}`, {
      signal: AbortSignal.timeout(timeout),
    });
    const data: NostrJson = await res.json();
    const match = Object.keys(data.names).find(n => {
      return n.toLowerCase() === name.toLowerCase();
    });
    return match ? data.names[match] : undefined;
  } catch {
    // ignored
  }

  return undefined;
}
