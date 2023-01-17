import { useMemo } from "react";
import { Link } from "react-router-dom";
import useProfile from "../feed/ProfileFeed";
import { HexKey } from "../nostr";
import { hexToBech32, profileLink } from "../Util";

export default function Mention({ pubkey }: { pubkey: HexKey }) {
    const user = useProfile(pubkey)?.get(pubkey);

    const name = useMemo(() => {
        let name = hexToBech32("npub", pubkey).substring(0, 12);
        if ((user?.display_name?.length ?? 0) > 0) {
            name = user!.display_name!;
        } else if ((user?.name?.length ?? 0) > 0) {
            name = user!.name!;
        }
        return name;
    }, [user, pubkey]);

    return <Link to={profileLink(pubkey)} onClick={(e) => e.stopPropagation()}>@{name}</Link>
}