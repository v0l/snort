import { useSelector } from "react-redux";
import Note from "../element/Note";
import useTimelineFeed from "./feed/TimelineFeed";

export default function Timeline() {
    const follows = useSelector(a => a.login.follows)
    const { notes } = useTimelineFeed(follows);

    return (
        <div className="timeline">
            {notes?.sort((a, b) => b.created_at - a.created_at).map(e => <Note key={e.id} data={e} />)}
        </div>
    );
}