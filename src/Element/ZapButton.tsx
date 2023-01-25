import "./ZapButton.css";
import { faBolt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import { useUserProfile } from "Feed/ProfileFeed";
import { HexKey } from "Nostr";
import LNURLTip from "Element/LNURLTip";


const ZapButton = ({ pubkey, svc }: { pubkey?: HexKey, svc?: string }) => {
    const profile = useUserProfile(pubkey!)
    const [zap, setZap] = useState(false);
    const service = svc ?? (profile?.lud16 || profile?.lud06);

    if (!service) return null;

    return (
        <>
            <div className="zap-button" onClick={(e) => setZap(true)}>
                <FontAwesomeIcon icon={faBolt} />
            </div>
            <LNURLTip svc={service} show={zap} onClose={() => setZap(false)} />
        </>
    )
}

export default ZapButton;
