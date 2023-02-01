import "./Root.css";
import { useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

import { RootState } from "State/Store";
import { NoteCreator } from "Element/NoteCreator";
import Timeline from "Element/Timeline";
import { HexKey } from "Nostr";
import { TimelineSubject } from "Feed/TimelineFeed";

const RootTab = {
    Posts: 0,
    PostsAndReplies: 1,
    Global: 2
};

export default function RootPage() {
    const [show, setShow] = useState(false)
    const [loggedOut, pubKey, follows] = useSelector<RootState, [boolean | undefined, HexKey | undefined, HexKey[]]>(s => [s.login.loggedOut, s.login.publicKey, s.login.follows]);
    const [tab, setTab] = useState(RootTab.Posts);

    function followHints() {
        if (follows?.length === 0 && pubKey && tab !== RootTab.Global) {
            return <>
                Hmm nothing here.. Checkout <Link to={"/new"}>New users page</Link> to follow some recommended nostrich's!
            </>
        }
    }

    const isGlobal = loggedOut || tab === RootTab.Global;
    const timelineSubect: TimelineSubject = isGlobal ? { type: "global", items: [] } : { type: "pubkey", items: follows };
    return (
        <>
            {pubKey ? <>
                <div className="tabs">
                    <div className={`tab f-1 ${tab === RootTab.Posts ? "active" : ""}`} onClick={() => setTab(RootTab.Posts)}>
                        Posts
                    </div>
                    <div className={`tab f-1 ${tab === RootTab.PostsAndReplies ? "active" : ""}`} onClick={() => setTab(RootTab.PostsAndReplies)}>
                        Conversations
                    </div>
                    <div className={`tab f-1 ${tab === RootTab.Global ? "active" : ""}`} onClick={() => setTab(RootTab.Global)}>
                        Global
                    </div>
                </div></> : null}
            {followHints()}
            <Timeline key={tab} subject={timelineSubect} postsOnly={tab === RootTab.Posts} method={"TIME_RANGE"} />
            <NoteCreator replyTo={undefined} autoFocus={true} show={show} setShow={setShow} />
        </>
    );
}
