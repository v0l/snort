import "./ZapButton.css";
import { faBolt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import useProfile from "Feed/ProfileFeed";
import { HexKey } from "Nostr";
import LNURLTip from "Element/LNURLTip";

const ZapButton = ({ pubkey }: { pubkey: HexKey }) => {
    const profile = useProfile(pubkey)?.get(pubkey);
    const [zap, setZap] = useState(false);
    const svc = profile?.lud16 || profile?.lud06;

    if (!svc) return null;

    return (
        <>
            <div className="zap-button" onClick={(e) => setZap(true)}>
                <FontAwesomeIcon icon={faBolt} />
            </div>
            <LNURLTip svc={svc} show={zap} onClose={() => setZap(false)} />
        </>
    )
}

export default ZapButton;
