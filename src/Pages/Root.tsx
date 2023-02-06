import "./Root.css";
import { useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

import Tabs, { Tab } from "Element/Tabs";
import { RootState } from "State/Store";
import Timeline from "Element/Timeline";
import { HexKey } from "Nostr";
import { TimelineSubject } from "Feed/TimelineFeed";

const RootTab: Record<string, Tab> = {
  Posts: { text: 'Posts', value: 0, },
  PostsAndReplies: { text: 'Conversations', value: 1, },
  Global: { text: 'Global', value: 2 },
};

export default function RootPage() {
    const [loggedOut, pubKey, follows] = useSelector<RootState, [boolean | undefined, HexKey | undefined, HexKey[]]>(s => [s.login.loggedOut, s.login.publicKey, s.login.follows]);
    const [tab, setTab] = useState<Tab>(RootTab.Posts);

    function followHints() {
        if (follows?.length === 0 && pubKey && tab !== RootTab.Global) {
            return <>
                Hmm nothing here.. Checkout <Link to={"/new"}>New users page</Link> to follow some recommended nostrich's!
            </>
        }
    }

    const isGlobal = loggedOut || tab.value === RootTab.Global.value;
    const timelineSubect: TimelineSubject = isGlobal ? { type: "global", items: [], discriminator: "all" } : { type: "pubkey", items: follows, discriminator: "follows" };
    return (
        <>
           <div className="main-content">
             {pubKey && <Tabs tabs={[RootTab.Posts, RootTab.PostsAndReplies, RootTab.Global]} tab={tab} setTab={setTab} />}
            </div>
            {followHints()}
            <Timeline
              key={tab.value}
              subject={timelineSubect}
              postsOnly={tab.value === RootTab.Posts.value}
              method={"TIME_RANGE"}
              window={tab.value === RootTab.Global.value ? 60 : undefined}
            />
        </>
    );
}
