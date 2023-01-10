import { useMemo } from "react";
import useFollowersFeed from "../feed/FollowersFeed";
import EventKind from "../nostr/EventKind";
import ProfilePreview from "./ProfilePreview";

export default function FollowersList(props) {
    const feed = useFollowersFeed(props.pubkey);

    const pubKeys = useMemo(() => {
        let contactLists = feed?.notes.filter(a => a.kind === EventKind.ContactList && a.tags.some(b => b[0] === "p" && b[1] === props.pubkey));
        return [...new Set(contactLists?.map(a => a.pubkey))];
    }, [feed]);

    return (
        <>
            {pubKeys?.map(a => <ProfilePreview pubkey={a} key={a} options={{ about: false }}/>)}
        </>
    )
}