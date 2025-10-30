import { useUserProfile } from "@snort/system-react";

function useIsVerified(pubkey?: string, bypassCheck?: boolean) {
  const profile = useUserProfile(pubkey);
  return { isVerified: bypassCheck || profile?.isNostrAddressValid };
}

interface Nip05Params {
  nip05?: string;
  pubkey: string;
  verifyNip?: boolean;
}

const Nip05 = ({ nip05, pubkey, verifyNip = true }: Nip05Params) => {
  const [name, domain] = nip05 ? nip05.split("@") : [];
  const isDefaultUser = name === "_";
  const { isVerified } = useIsVerified(pubkey, !verifyNip);

  const isSpecialDomain = domain?.toLowerCase() === "iris.to" || domain?.toLowerCase() === "snort.social";

  return (
    <div className={`flex text-neutral-400 font-normal${!isVerified ? " opacity-50" : ""}`}>
      {!isDefaultUser && isVerified && <span className="nick">{`${name}@`}</span>}
      {isVerified && (
        <>
          <span
            className={`${isSpecialDomain ? "bg-clip-text text-transparent bg-[image:var(--snort-gradient)]" : "text-neutral-400"}`}
            data-domain={domain?.toLowerCase()}>
            {domain}
          </span>
        </>
      )}
    </div>
  );
};

export default Nip05;
