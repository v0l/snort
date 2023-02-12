import "./Nip05.css";
import { useQuery } from "react-query";
import Badge from "Icons/Badge";
import { HexKey } from "@snort/nostr";

interface NostrJson {
  names: Record<string, string>;
}

async function fetchNip05Pubkey(name: string, domain: string) {
  if (!name || !domain) {
    return undefined;
  }
  try {
    const res = await fetch(`https://${domain}/.well-known/nostr.json?name=${encodeURIComponent(name)}`);
    const data: NostrJson = await res.json();
    const match = Object.keys(data.names).find(n => {
      return n.toLowerCase() === name.toLowerCase();
    });
    return match ? data.names[match] : undefined;
  } catch (error) {
    return undefined;
  }
}

const VERIFICATION_CACHE_TIME = 24 * 60 * 60 * 1000;
const VERIFICATION_STALE_TIMEOUT = 10 * 60 * 1000;

export function useIsVerified(pubkey: HexKey, nip05?: string, bypassCheck?: boolean) {
  const [name, domain] = nip05 ? nip05.split("@") : [];
  const { isError, isSuccess, data } = useQuery(
    ["nip05", nip05],
    () => (bypassCheck ? Promise.resolve(pubkey) : fetchNip05Pubkey(name, domain)),
    {
      retry: false,
      retryOnMount: false,
      cacheTime: VERIFICATION_CACHE_TIME,
      staleTime: VERIFICATION_STALE_TIMEOUT,
    }
  );
  const isVerified = isSuccess && data === pubkey;
  const cantVerify = isSuccess && data !== pubkey;
  return { isVerified, couldNotVerify: isError || cantVerify };
}

export interface Nip05Params {
  nip05?: string;
  pubkey: HexKey;
  verifyNip?: boolean;
}

const Nip05 = ({ nip05, pubkey, verifyNip = true }: Nip05Params) => {
  const [name, domain] = nip05 ? nip05.split("@") : [];
  const isDefaultUser = name === "_";
  const { isVerified, couldNotVerify } = useIsVerified(pubkey, nip05, !verifyNip);

  return (
    <div className={`flex nip05${couldNotVerify ? " failed" : ""}`} onClick={ev => ev.stopPropagation()}>
      {!isDefaultUser && isVerified && <span className="nick">{`${name}@`}</span>}
      {isVerified && (
        <>
          <span className="domain f-ellipsis" data-domain={domain?.toLowerCase()}>
            {domain}
          </span>
          <span className="badge">
            <Badge />
          </span>
        </>
      )}
    </div>
  );
};

export default Nip05;
