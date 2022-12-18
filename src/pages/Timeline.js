import Note from "../element/Note";
import useTimelineFeed from "./feed/TimelineFeed";

export default function Timeline() {
    const { notes } = useTimelineFeed();

    const sorted = [
        ...(notes || [])
    ].sort((a, b) => b.created_at - a.created_at);

    return (
        <div className="timeline">
            {sorted.map(e => <Note key={e.id} data={e}/>)}
        </div>
    );
}