import { useParams } from "react-router-dom";
import Thread from "../element/Thread";
import useThreadFeed from "../feed/ThreadFeed";
import { parseId } from "../Util";

export default function EventPage() {
    const params = useParams();
    const id = parseId(params.id!);
    const thread = useThreadFeed(id);

    return <Thread notes={thread.notes} this={id} />;
}