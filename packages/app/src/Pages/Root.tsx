import "./Root.css";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { useIntl, FormattedMessage } from "react-intl";

import Tabs, { Tab } from "Element/Tabs";
import { RootState } from "State/Store";
import Timeline from "Element/Timeline";
import { System } from "@snort/nostr";
import { TimelineSubject } from "Feed/TimelineFeed";

import messages from "./messages";
import { debounce } from "Util";

export default function RootPage() {
  const { formatMessage } = useIntl();
  const { loggedOut, publicKey: pubKey, follows, tags, relays } = useSelector((s: RootState) => s.login);
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
  const [relay, setRelay] = useState<string>();
  const [globalRelays, setGlobalRelays] = useState<string[]>([]);
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

  useEffect(() => {
    return debounce(1_000, () => {
      const ret: string[] = [];
      System.Sockets.forEach((v, k) => {
        if (v.Info?.limitation?.payment_required === true) {
          ret.push(k);
        }
      });

      if (ret.length > 0 && !relay) {
        setRelay(ret[0]);
      }
      setGlobalRelays(ret);
    });
  }, [relays, relay]);

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
      {isGlobal && globalRelays.length > 0 && (
        <div className="flex mb10 f-end">
          <FormattedMessage
            defaultMessage="Read global from"
            description="Label for reading global feed from specific relays"
          />
          &nbsp;
          <select onChange={e => setRelay(e.target.value)}>
            {globalRelays.map(a => (
              <option key={a} value={a}>
                {new URL(a).host}
              </option>
            ))}
          </select>
        </div>
      )}
      {followHints()}
      <Timeline
        key={tab.value}
        subject={timelineSubect}
        postsOnly={tab.value === RootTab.Posts.value}
        method={"TIME_RANGE"}
        window={undefined}
        relay={isGlobal ? relay : undefined}
      />
    </>
  );
}
