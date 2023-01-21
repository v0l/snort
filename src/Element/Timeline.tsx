import "./Timeline.css";
import { useMemo } from "react";
import useTimelineFeed, { TimelineSubject } from "Feed/TimelineFeed";
import { TaggedRawEvent } from "Nostr";
import EventKind from "Nostr/EventKind";
import LoadMore from "Element/LoadMore";
import Note from "Element/Note";
import NoteReaction from "Element/NoteReaction";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFastForward, faForward } from "@fortawesome/free-solid-svg-icons";

export interface TimelineProps {
    postsOnly: boolean,
    subject: TimelineSubject,
    method: "TIME_RANGE" | "LIMIT_UNTIL"
}

/**
 * A list of notes by pubkeys
 */
export default function Timeline({ subject, postsOnly = false, method }: TimelineProps) {
    const { main, related, latest, loadMore, showLatest } = useTimelineFeed(subject, {
        method
    });

    const filterPosts = (notes: TaggedRawEvent[]) => {
        return [...notes].sort((a, b) => b.created_at - a.created_at)?.filter(a => postsOnly ? !a.tags.some(b => b[0] === "e") : true);
    }

    const mainFeed = useMemo(() => {
        return filterPosts(main.notes);
    }, [main]);

    const latestFeed = useMemo(() => {
        return filterPosts(latest.notes);
    }, [latest]);

    function eventElement(e: TaggedRawEvent) {
        switch (e.kind) {
            case EventKind.TextNote: {
                return <Note key={e.id} data={e} related={related.notes} />
            }
            case EventKind.Reaction:
            case EventKind.Repost: {
                return <NoteReaction data={e} key={e.id} />
            }
        }
    }

    return (
        <>
            {latestFeed.length > 1 && (<div className="card latest-notes pointer" onClick={() => showLatest()}>
                <FontAwesomeIcon icon={faForward}  size="xl"/>
                &nbsp;
                Show latest {latestFeed.length} notes
            </div>)}
            {mainFeed.map(eventElement)}
            {mainFeed.length > 0 ? <LoadMore onLoadMore={loadMore} /> : null}
        </>
    );
}