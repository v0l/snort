import "./Root.css";
import { useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { useIntl, FormattedMessage } from "react-intl";

import Tabs, { Tab } from "Element/Tabs";
import { RootState } from "State/Store";
import Timeline from "Element/Timeline";
import { TimelineSubject } from "Feed/TimelineFeed";

import messages from "./messages";

export default function RootPage() {
  const { formatMessage } = useIntl();
  const { loggedOut, publicKey: pubKey, follows, tags } = useSelector((s: RootState) => s.login);
  const RootTab: Record<string, Tab> = {
    Posts: {
      text: formatMessage(messages.Posts),
      value: 0,
    },
    PostsAndReplies: {
      text: formatMessage(messages.Conversations),
      value: 1,
    },
    Global: {
      text: formatMessage(messages.Global),
      value: 2,
    },
  };
  const [tab, setTab] = useState<Tab>(RootTab.Posts);
  const tagTabs = tags.map((t, idx) => {
    return { text: `#${t}`, value: idx + 3 };
  });
  const tabs = [RootTab.Posts, RootTab.PostsAndReplies, RootTab.Global, ...tagTabs];

  function followHints() {
    if (follows?.length === 0 && pubKey && tab !== RootTab.Global) {
      return (
        <FormattedMessage
          {...messages.NoFollows}
          values={{
            newUsersPage: (
              <Link to={"/new/discover"}>
                <FormattedMessage {...messages.NewUsers} />
              </Link>
            ),
          }}
        />
      );
    }
  }

  const isGlobal = loggedOut || tab.value === RootTab.Global.value;
  const timelineSubect: TimelineSubject = (() => {
    if (isGlobal) {
      return { type: "global", items: [], discriminator: "all" };
    }
    if (tab.value >= 3) {
      const hashtag = tab.text.slice(1);
      return { type: "hashtag", items: [hashtag], discriminator: hashtag };
    }

    return { type: "pubkey", items: follows, discriminator: "follows" };
  })();
  return (
    <>
      <div className="main-content">{pubKey && <Tabs tabs={tabs} tab={tab} setTab={setTab} />}</div>
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
