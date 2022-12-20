import { useEffect } from "react";
import { useParams } from "react-router-dom";
import Note from "../element/Note";
import Thread from "../element/Thread";
import useThreadFeed from "./feed/ThreadFeed";

export default function EventPage() {
    const params = useParams();
    const id = params.id;

    const { notes } = useThreadFeed(id);

    if(notes) {
        return (
            <Thread notes={notes}/>
        )
    }
    return (
        <>Loading {id.substring(0, 8)}...</>
    );
}