import { useMemo } from "react";
import { useSelector } from "react-redux";
import useTimelineFeed from "../feed/TimelineFeed";
import EventKind from "../nostr/EventKind";
import Event from "../nostr/Event";
import Note from "./Note";
import NoteReaction from "./NoteReaction";

/**
 * A list of notes by pubkeys
 */
export default function Timeline({ global, pubkeys }) {
    const feed = useTimelineFeed(pubkeys, global);
    const reactions = useSelector(s => s.reactions)
    const feedReactions = feed?.others || []
    const allReactions = [...new Set([...reactions.user, ...feedReactions])]

    function reaction(id, kind = EventKind.Reaction) {
        return allReactions.filter(a => a.kind === kind && a.tags.some(b => b[0] === "e" && b[1] === id)).map(Event.FromObject);
    }

    const mainFeed = useMemo(() => {
        return feed.main?.sort((a, b) => b.created_at - a.created_at);
    }, [feed]);

    function eventElement(e) {
        switch (e.kind) {
            case EventKind.TextNote: {
                return <Note key={e.id} data={e} reactions={reaction(e.id)} deletion={reaction(e.id, EventKind.Deletion)} />
            }
            case EventKind.Reaction:
            case EventKind.Repost: {
                return <NoteReaction data={e} key={e.id}/>
            }
        }
    }

    return mainFeed.map(eventElement);
}