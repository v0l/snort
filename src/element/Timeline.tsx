import { useMemo } from "react";
import useTimelineFeed, { TimelineSubject } from "Feed/TimelineFeed";
import { TaggedRawEvent } from "Nostr";
import EventKind from "Nostr/EventKind";
import LoadMore from "Element/LoadMore";
import Note from "Element/Note";
import NoteReaction from "Element/NoteReaction";

export interface TimelineProps {
    postsOnly: boolean,
    subject: TimelineSubject,
    method: "TIME_RANGE" | "LIMIT_UNTIL"
}

/**
 * A list of notes by pubkeys
 */
export default function Timeline({ subject, postsOnly = false, method }: TimelineProps) {
    const { main, others, loadMore } = useTimelineFeed(subject, {
        method
    });

    const mainFeed = useMemo(() => {
        return main?.sort((a, b) => b.created_at - a.created_at)?.filter(a => postsOnly ? !a.tags.some(b => b[0] === "e") : true);
    }, [main]);

    function eventElement(e: TaggedRawEvent) {
        switch (e.kind) {
            case EventKind.TextNote: {
                return <Note key={e.id} data={e} related={others} />
            }
            case EventKind.Reaction:
            case EventKind.Repost: {
                return <NoteReaction data={e} key={e.id} />
            }
        }
    }

    return (
        <>
            {mainFeed.map(eventElement)}
            {mainFeed.length > 0 ? <LoadMore onLoadMore={loadMore} /> : null}
        </>
    );
}