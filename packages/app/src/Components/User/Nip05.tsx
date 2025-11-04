import { Day } from "@/Utils/Const";
import { fetchNip05Pubkey } from "@snort/shared";
import { useCached, useUserProfile } from "@snort/system-react";
import { useInView } from "react-intersection-observer";
import Icon from "../Icons/Icon";

export interface Nip05Params {
  nip05?: string;
  pubkey?: string;
  /**
   * Force the handle as verified, for display purposes
   */
  forceVerified?: boolean;

  /**
   * Show verification badges
   */
  showBadges?: boolean;
}

export default function Nip05({ nip05, pubkey, forceVerified, showBadges }: Nip05Params) {
  const { inView, ref } = useInView({ triggerOnce: true });
  const profile = useUserProfile(pubkey);
  const toSplit = nip05 ?? profile?.nip05;

  const [name, domain] = toSplit ? toSplit.split("@") : [];
  const isDefaultUser = name === "_";
  const { data } = useCached(
    toSplit && inView && pubkey ? `nip5:${toSplit}` : undefined,
    async () => {
      return await fetchNip05Pubkey(name, domain);
    },
    Day,
  );

  const canVerify = pubkey !== undefined;
  const isVerified = (forceVerified ?? false) || (data === pubkey && canVerify);
  const isSpecialDomain =
    domain?.toLowerCase() === "snort.social" || domain?.toLowerCase() === CONFIG.nip05Domain.toLowerCase();

  return (
    <div className={`flex items-center text-neutral-400 font-normal${!isVerified ? " opacity-50" : ""}`} ref={ref}>
      {!isDefaultUser && <span className="nick">{`${name}@`}</span>}
      <span className={`${isSpecialDomain && isVerified ? "text-snort-gradient" : "text-neutral-400"}`}>{domain}</span>
      {(showBadges ?? false) && (
        <Icon size={12} name={isVerified ? "check" : "x"} className={isVerified ? "text-success ml-1" : "ml-1"} />
      )}
    </div>
  );
}
