import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux"
import Note from "Element/Note";
import NoteReaction from "Element/NoteReaction";
import useSubscription from "Feed/Subscription";
import { TaggedRawEvent } from "Nostr";
import Event from "Nostr/Event";
import EventKind from "Nostr/EventKind";
import { Subscriptions } from "Nostr/Subscriptions";
import { markNotificationsRead } from "State/Login";
import { RootState } from "State/Store";

export default function NotificationsPage() {
    const dispatch = useDispatch();
    const notifications = useSelector<RootState, TaggedRawEvent[]>(s => s.login.notifications);

    useEffect(() => {
        dispatch(markNotificationsRead());
    }, []);

    const etagged = useMemo(() => {
        return notifications?.filter(a => a.kind === EventKind.Reaction)
            .map(a => {
                let ev = new Event(a);
                return ev.Thread?.ReplyTo?.Event ?? ev.Thread?.Root?.Event;
            }).filter(a => a !== undefined).map(a => a!);
    }, [notifications]);

    const subEvents = useMemo(() => {
        let sub = new Subscriptions();
        sub.Id = `reactions:${sub.Id}`;
        sub.Kinds = new Set([EventKind.Reaction]);
        sub.ETags = new Set(notifications?.filter(b => b.kind === EventKind.TextNote).map(b => b.id));

        if (etagged.length > 0) {
            let reactionsTo = new Subscriptions();
            reactionsTo.Kinds = new Set([EventKind.TextNote]);
            reactionsTo.Ids = new Set(etagged);
            sub.OrSubs.push(reactionsTo);
        }
        return sub;
    }, [etagged]);

    const otherNotes = useSubscription(subEvents, { leaveOpen: true });

    const sorted = [
        ...notifications
    ].sort((a, b) => b.created_at - a.created_at);

    return (
        <>
            {sorted?.map(a => {
                if (a.kind === EventKind.TextNote) {
                    return <Note data={a} key={a.id} related={otherNotes?.notes ?? []} />
                } else if (a.kind === EventKind.Reaction) {
                    let ev = new Event(a);
                    let reactedTo = ev.Thread?.ReplyTo?.Event ?? ev.Thread?.Root?.Event;
                    let reactedNote = otherNotes?.notes?.find(c => c.id === reactedTo);
                    return <NoteReaction data={a} key={a.id} root={reactedNote} />
                }
                return null;
            })}
        </>
    )
}