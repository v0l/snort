import Event from "../nostr/Event";
import EventKind from "../nostr/EventKind";
import Note from "./Note";
import NoteGhost from "./NoteGhost";

export default function Thread(props) {
    const thisEvent = props.this;

    /** @type {Array<Event>} */
    const notes = props.notes?.map(a => Event.FromObject(a));

    // root note has no thread info
    const root = notes.find(a => a.GetThread() === null);

    function reactions(id) {
        return notes?.filter(a => a.Kind === EventKind.Reaction && a.Tags.find(a => a.Key === "e").Event === id);
    }

    const repliesToRoot = notes?.
        filter(a => a.GetThread()?.Root !== null && a.Kind === EventKind.TextNote && a.Id !== thisEvent && a.Id !== root?.Id)
        .sort((a, b) => a.CreatedAt - b.CreatedAt);
    const thisNote = notes?.find(a => a.Id === thisEvent);
    const thisIsRootNote = thisNote?.Id === root?.Id;
    return (
        <>
            {root === undefined ?
                <NoteGhost text={`Loading... (${notes.length} events loaded)`}/>
                : <Note data-ev={root} reactions={reactions(root?.Id)} />}
            {thisNote && !thisIsRootNote ? <Note data-ev={thisNote} reactions={reactions(thisNote.Id)}/> : null}
            <h4>Other Replies</h4>
            {repliesToRoot?.map(a => <Note key={a.Id} data-ev={a} reactions={reactions(a.Id)} />)}
        </>
    );
}