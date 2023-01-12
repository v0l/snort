import { useMemo } from "react";
import { useSelector } from "react-redux"

import { RawEvent } from "../nostr";

// @ts-ignore
import ProfileImage from "../element/ProfileImage";
// @ts-ignore
import { hexToBech32 } from "../Util";

export default function MessagesPage() {
    const pubKey = useSelector<any, string>(s => s.login.publicKey);
    const dms = useSelector<any, RawEvent[]>(s => s.login.dms);

    const pubKeys = useMemo(() => {
        return Array.from(new Set<string>(dms.map(a => a.pubkey)));
    }, [dms]);

    function person(pubkey: string) {
        return (
            <div className="flex" key={pubkey}>
                <ProfileImage pubkey={pubkey} className="f-grow" link={`/messages/${hexToBech32("npub", pubkey)}`} />
                <span className="pill">
                    {dms?.filter(a => a.pubkey === pubkey && a.pubkey !== pubKey).length}
                </span>
            </div>
        )
    }

    return (
        <>
            <h3>Messages</h3>
            {pubKeys.map(person)}
        </>
    )
}