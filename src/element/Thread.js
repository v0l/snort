import Event from "../nostr/Event";
import Note from "./Note";

export default function Thread(props) {
    /** @type {Array<Event>} */
    const notes = props.notes?.map(a => Event.FromObject(a));

    // root note has no thread info
    const root = notes.find(a => a.GetThread() === null);
    if(root === undefined) {
        return null;
    }

    const repliesToRoot = notes?.filter(a => a.GetThread()?.ReplyTo?.Event === root.Id);
    return (
        <>
            <Note data={root?.ToObject()}/>
            {repliesToRoot?.map(a => <Note key={a.Id} data={a.ToObject()}/>)}
        </>
    );
}