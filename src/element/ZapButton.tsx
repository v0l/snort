import { faBolt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import useProfile from "../feed/ProfileFeed";
import { HexKey } from "../nostr";
import LNURLTip from "./LNURLTip";

const ZapButton = ({ pubkey }: { pubkey: HexKey }) => {
    const profile = useProfile(pubkey)?.get(pubkey);
    const [zap, setZap] = useState(false);
    const svc = profile?.lud16 || profile?.lud06;

    if (!svc) return null;

    return (
        <>
            <span className="pill" onClick={(e) => setZap(true)}>
                <FontAwesomeIcon icon={faBolt} />
            </span>
            <LNURLTip svc={svc} show={zap} onClose={() => setZap(false)} />
        </>
    )
}

export default ZapButton;