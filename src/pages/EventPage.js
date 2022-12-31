import { useParams } from "react-router-dom";
import Thread from "../element/Thread";
import useThreadFeed from "../feed/ThreadFeed";

export default function EventPage() {
    const params = useParams();
    const id = params.id;

    const { main, other } = useThreadFeed(id);
    return <Thread notes={[
        ...main,
        ...other
    ].filter((v, i, a) => a.indexOf(b => b.id === v.id) === -1)} this={id} />;
}