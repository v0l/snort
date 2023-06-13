import DnsOverHttpResolver from "dns-over-http-resolver";
import { bech32ToHex } from "SnortUtils";

const resolver = new DnsOverHttpResolver();
interface NostrJson {
  names: Record<string, string>;
}

export async function fetchNip05Pubkey(name: string, domain: string, timeout = 2_000) {
  if (!name || !domain) {
    return undefined;
  }
  try {
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

  // Check as DoH TXT entry
  try {
    const resDns = await resolver.resolveTxt(`${name}._nostr.${domain}`);
    return bech32ToHex(resDns[0][0]);
  } catch {
    // ignored
  }
  return undefined;
}
