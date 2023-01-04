import useTimelineFeed from "../feed/TimelineFeed";
import EventKind from "../nostr/EventKind";
import Note from "./Note";

/**
 * A list of notes by pubkeys
 */
export default function Timeline(props) {
    const pubkeys = props.pubkeys;
    const global = props.global;
    const feed = useTimelineFeed(pubkeys, global ?? false);

    function reaction(id, kind = EventKind.Reaction) {
        return feed?.others?.filter(a => a.kind === kind && a.tags.some(b => b[0] === "e" && b[1] === id));
    }

    return (
        <>
            {feed.main?.sort((a, b) => b.created_at - a.created_at)
                .map(a => <Note key={a.id} data={a} reactions={reaction(a.id)} deletion={reaction(a.id, EventKind.Deletion)} />)}
        </>
    )
}