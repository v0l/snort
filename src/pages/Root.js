import "./Root.css";
import { useSelector } from "react-redux";
import Note from "../element/Note";
import useTimelineFeed from "../feed/TimelineFeed";
import { NoteCreator } from "../element/NoteCreator";

export default function RootPage() {
    const pubKey = useSelector(s => s.login.publicKey);
    const follows = useSelector(a => a.login.follows);
    const { notes } = useTimelineFeed(follows);

    function followHints() {
        if (follows?.length === 0 && pubKey) {
            return <>Hmm nothing here..</>
        }
    }

    return (
        <>
            {pubKey ? <NoteCreator /> : null}
            {followHints()}
            <div className="timeline">
                {notes?.sort((a, b) => b.created_at - a.created_at).map(e => <Note key={e.id} data={e} />)}
            </div>
        </>
    );
}