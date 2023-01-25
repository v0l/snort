import "./Timeline.css";
import { useCallback, useMemo } from "react";
import useTimelineFeed, { TimelineSubject } from "Feed/TimelineFeed";
import { TaggedRawEvent } from "Nostr";
import EventKind from "Nostr/EventKind";
import LoadMore from "Element/LoadMore";
import Note from "Element/Note";
import NoteReaction from "Element/NoteReaction";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faForward } from "@fortawesome/free-solid-svg-icons";

export interface TimelineProps {
    postsOnly: boolean,
    subject: TimelineSubject,
    method: "TIME_RANGE" | "LIMIT_UNTIL"
}

/**
 * A list of notes by pubkeys
 */
export default function Timeline({ subject, postsOnly = false, method }: TimelineProps) {
    const { main, related, latest, parent, loadMore, showLatest } = useTimelineFeed(subject, {
        method
    });

    const filterPosts = useCallback((nts: TaggedRawEvent[]) => {
        return [...nts].sort((a, b) => b.created_at - a.created_at)?.filter(a => postsOnly ? !a.tags.some(b => b[0] === "e") : true);
    }, [postsOnly]);

    const mainFeed = useMemo(() => {
        return filterPosts(main.notes);
    }, [main, filterPosts]);

    const latestFeed = useMemo(() => {
        return filterPosts(latest.notes).filter(a => !mainFeed.some(b => b.id === a.id));
    }, [latest, mainFeed, filterPosts]);

    function eventElement(e: TaggedRawEvent) {
        switch (e.kind) {
            case EventKind.TextNote: {
                return <Note key={e.id} data={e} related={related.notes} />
            }
            case EventKind.Reaction:
            case EventKind.Repost: {
                let eRef = e.tags.find(a => a[0] === "e")?.at(1);
                return <NoteReaction data={e} key={e.id} root={parent.notes.find(a => a.id === eRef)}/>
            }
        }
    }

    return (
        <div className="main-content">
            {latestFeed.length > 1 && (<div className="card latest-notes pointer" onClick={() => showLatest()}>
                <FontAwesomeIcon icon={faForward}  size="xl"/>
                &nbsp;
                Show latest {latestFeed.length - 1} notes
            </div>)}
            {mainFeed.map(eventElement)}
            <LoadMore onLoadMore={loadMore} shouldLoadMore={main.end}/>
        </div>
    );
}
