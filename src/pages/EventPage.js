import { useMemo } from "react";
import { useParams } from "react-router-dom";
import Thread from "../element/Thread";
import useThreadFeed from "../feed/ThreadFeed";

export default function EventPage() {
    const params = useParams();
    const id = params.id;

    const thread = useThreadFeed(id);

    const filtered = useMemo(() => {
        return [
            ...thread.main,
            ...thread.other
        ].filter((v, i, a) => a.findIndex(x => x.id === v.id) === i);
    }, [thread]);

    return <Thread notes={filtered} this={id} />;
}