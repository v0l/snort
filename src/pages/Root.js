import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { NoteCreator } from "../element/NoteCreator";
import Timeline from "../element/Timeline";

export default function RootPage() {
    const [loggedOut, pubKey, follows] = useSelector(s => [s.login.loggedOut, s.login.publicKey, s.login.follows]);

    function followHints() {
        if (follows?.length === 0 && pubKey) {
            return <>
                Hmm nothing here.. Checkout <Link to={"/new"}>New users page</Link> to follow some recommended nostrich's!
            </>
        }
    }

    return (
        <>
            {pubKey ? <NoteCreator /> : null}
            {followHints()}
            <Timeline pubkeys={follows} global={loggedOut === true} />
        </>
    );
}