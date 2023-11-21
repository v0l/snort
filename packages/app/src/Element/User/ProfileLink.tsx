import { ReactNode, useContext } from "react";
import { Link, LinkProps } from "react-router-dom";
import { UserMetadata, NostrLink, NostrPrefix, MetadataCache } from "@snort/system";
import { SnortContext } from "@snort/system-react";
import { randomSample } from "@/SnortUtils";

export function ProfileLink({
  pubkey,
  user,
  link,
  explicitLink,
  children,
  ...others
}: {
  pubkey: string;
  user?: UserMetadata | MetadataCache;
  link?: NostrLink;
  explicitLink?: string;
  children?: ReactNode;
} & Omit<LinkProps, "to">) {
  const system = useContext(SnortContext);
  const relays = system.RelayCache.getFromCache(pubkey)
    ?.relays?.filter(a => a.settings.write)
    ?.map(a => a.url);

  function profileLink() {
    if (explicitLink) {
      return explicitLink;
    }
    if (user) {
      if (
        user.nip05 &&
        user.nip05.endsWith(`@${CONFIG.nip05Domain}`) &&
        (!("isNostrAddressValid" in user) || user.isNostrAddressValid)
      ) {
        const [username] = user.nip05.split("@");
        return `/${username}`;
      }
      return `/${new NostrLink(
        NostrPrefix.Profile,
        pubkey,
        undefined,
        undefined,
        relays ? randomSample(relays, 3) : undefined,
      ).encode(CONFIG.profileLinkPrefix)}`;
    }
    if (link && (link.type === NostrPrefix.Profile || link.type === NostrPrefix.PublicKey)) {
      return `/${link.encode()}`;
    }
    return "#";
  }

  const oFiltered = others as Record<string, unknown>;
  delete oFiltered["user"];
  delete oFiltered["link"];
  delete oFiltered["children"];
  return (
    <Link {...oFiltered} to={profileLink()} state={user}>
      {children}
    </Link>
  );
}
