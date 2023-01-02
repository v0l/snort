import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux"
import Note from "../element/Note";
import NoteReaction from "../element/NoteReaction";
import useSubscription from "../feed/Subscription";
import EventKind from "../nostr/EventKind";
import { Subscriptions } from "../nostr/Subscriptions";
import { markNotificationsRead } from "../state/Login";

export default function NotificationsPage() {
    const dispatch = useDispatch();
    const notifications = useSelector(s => s.login.notifications);

    useEffect(() => {
        dispatch(markNotificationsRead());
    }, []);

    const etagged = useMemo(() => {
        return notifications?.filter(a => a.kind === EventKind.Reaction)
            .map(a => a.tags.filter(b => b[0] === "e")[0][1])
    }, [notifications]);

    const subEvents = useMemo(() => {
        let sub = new Subscriptions();
        sub.Id = `reactions:${sub.Id}`;
        sub.Kinds.add(EventKind.TextNote);
        sub.Ids = new Set(etagged);

        let replyReactions = new Subscriptions();
        replyReactions.Kinds.add(EventKind.Reaction);
        replyReactions.ETags = new Set(notifications?.filter(b => b.kind === EventKind.TextNote).map(b => b.id));
        sub.OrSubs.push(replyReactions);
        return sub;
    }, [etagged]);

    const otherNotes = useSubscription(subEvents, { leaveOpen: true });

    const sorted = [
        ...notifications
    ].sort((a,b) => b.created_at - a.created_at);

    return (
        <>
            {sorted?.map(a => {
                if (a.kind === EventKind.TextNote) {
                    let reactions = otherNotes?.notes?.filter(c => c.tags.find(b => b[0] === "e" && b[1] === a.id));
                    return <Note data={a} key={a.id} reactions={reactions}/>
                } else if (a.kind === EventKind.Reaction) {
                    let reactedTo = a.tags.filter(a => a[0] === "e")[0][1];
                    let reactedNote = otherNotes?.notes?.find(c => c.id === reactedTo);
                    return <NoteReaction data={a} key={a.id} root={reactedNote} />
                }
                return null;
            })}
        </>
    )
}