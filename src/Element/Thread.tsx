import "./Thread.css";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { TaggedRawEvent, u256 } from "Nostr";
import { default as NEvent } from "Nostr/Event";
import EventKind from "Nostr/EventKind";
import { eventLink } from "Util";
import Note from "Element/Note";
import NoteGhost from "Element/NoteGhost";

export interface ThreadProps {
    this?: u256,
    notes?: TaggedRawEvent[]
}
export default function Thread(props: ThreadProps) {
    const thisEvent = props.this;
    const notes = props.notes ?? [];
    const parsedNotes = notes.map(a => new NEvent(a));

    // root note has no thread info
    const root = useMemo(() => parsedNotes.find(a => a.Thread === null), [notes]);

    const chains = useMemo(() => {
        let chains = new Map<u256, NEvent[]>();
        parsedNotes?.filter(a => a.Kind === EventKind.TextNote).sort((a, b) => b.CreatedAt - a.CreatedAt).forEach((v) => {
            let replyTo = v.Thread?.ReplyTo?.Event ?? v.Thread?.Root?.Event;
            if (replyTo) {
                if (!chains.has(replyTo)) {
                    chains.set(replyTo, [v]);
                } else {
                    chains.get(replyTo)!.push(v);
                }
            } else if (v.Tags.length > 0) {
                console.log("Not replying to anything: ", v);
            }
        });

        return chains;
    }, [notes]);

    const brokenChains = useMemo(() => {
        return Array.from(chains?.keys()).filter(a => !parsedNotes?.some(b => b.Id === a));
    }, [chains]);

    const mentionsRoot = useMemo(() => {
        return parsedNotes?.filter(a => a.Kind === EventKind.TextNote && a.Thread)
    }, [chains]);

    function renderRoot() {
        if (root) {
            return <Note
                data-ev={root}
                related={notes}
                isThread />
        } else {
            return <NoteGhost>
                Loading thread root.. ({notes?.length} notes loaded)
            </NoteGhost>
        }
    }

    function renderChain(from: u256) {
        if (from && chains) {
            let replies = chains.get(from);
            if (replies) {
                return (
                    <div className="indented">
                        {replies.map(a => {
                            return (
                                <>
                                    <Note data-ev={a}
                                        key={a.Id}
                                        related={notes}
                                        highlight={thisEvent === a.Id} />
                                    {renderChain(a.Id)}
                                </>
                            )
                        })}
                    </div>
                )
            }
        }
    }

    return (
        <div className="thread-container">
            {renderRoot()}
            {root ? renderChain(root.Id) : null}
            {root ? null : <>
                <h3>Other Replies</h3>
                {brokenChains.map(a => {
                    return (
                        <>
                            <NoteGhost key={a}>
                                Missing event <Link to={eventLink(a)}>{a.substring(0, 8)}</Link>
                            </NoteGhost>
                            {renderChain(a)}
                        </>
                    )
                })}
            </>}
        </div>
    );
}