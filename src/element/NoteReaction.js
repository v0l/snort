import "./NoteReaction.css";
import moment from "moment";
import EventKind from "../nostr/EventKind";
import Note from "./Note";
import ProfileImage from "./ProfileImage";

export default function NoteReaction(props) {
    const data = props.data;
    const root = props.root;

    if (data.kind !== EventKind.Reaction) {
        return null;
    }

    function mapReaction() {
        switch (data.content) {
            case "+": return "❤️";
            case "-": return "👎";
            default: {
                if (data.content.length === 0) {
                    return "❤️";
                }
                return data.content;
            }
        }
    }

    return (
        <div className="reaction">
            <div className="header flex">
                <ProfileImage pubkey={data.pubkey} subHeader={<small>Reacted with {mapReaction()}</small>} />
                <div className="info">
                    {moment(data.created_at * 1000).fromNow()}
                </div>
            </div>

            {root ? <Note data={root} options={{ showHeader: false, showFooter: false }} /> : root}
        </div>
    );
}