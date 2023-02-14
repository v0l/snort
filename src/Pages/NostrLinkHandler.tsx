import { NostrPrefix } from "Nostr/Links";
import { useEffect } from "react";
import { redirect, useNavigate, useParams } from "react-router-dom";

export default function NostrLinkHandler() {
    const params = useParams();
    const navigate = useNavigate();
    const link = decodeURIComponent(params["*"] ?? "");

    useEffect(() => {
        if (link.length > 0) {
            let ls = link.split(":");
            let entity = ls[1];
            if (entity.startsWith(NostrPrefix.PublicKey) || entity.startsWith(NostrPrefix.Profile)) {
                navigate(`/p/${entity}`);
            }
            else if (entity.startsWith(NostrPrefix.Event) || entity.startsWith(NostrPrefix.Note)) {
                navigate(`/e/${entity}`)
            }
        }
    }, [link]);

    return (
        <>Could not handle {link}</>
    )
}