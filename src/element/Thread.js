import Event from "../nostr/Event";
import EventKind from "../nostr/EventKind";
import Note from "./Note";

export default function Thread(props) {
    /** @type {Array<Event>} */
    const notes = props.notes?.map(a => Event.FromObject(a));

    // root note has no thread info
    const root = notes.find(a => a.GetThread() === null);
    if(root === undefined) {
        return null;
    }

    function reactions(id) {
        return notes?.filter(a => a.Kind === EventKind.Reaction && a.GetThread()?.Root?.Event === id);
    }

    const repliesToRoot = notes?.
        filter(a => a.GetThread()?.Root?.Event === root.Id && a.Kind === EventKind.TextNote)
        .sort((a, b) => b.CreatedAt - a.CreatedAt);
    return (
        <>
            <Note data={root?.ToObject()} reactions={reactions(root?.Id)}/>
            {repliesToRoot?.map(a => <Note key={a.Id} data={a.ToObject()} reactions={reactions(a.Id)}/>)}
        </>
    );
}