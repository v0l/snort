import "./Root.css";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { useIntl, FormattedMessage } from "react-intl";

import Tabs, { Tab } from "Element/Tabs";
import { RootState } from "State/Store";
import Timeline from "Element/Timeline";
import { System } from "System";
import { TimelineSubject } from "Feed/TimelineFeed";
import { debounce, getRelayName, sha256, unwrap } from "Util";

import messages from "./messages";

interface RelayOption {
  url: string;
  paid: boolean;
}

export default function RootPage() {
  const { formatMessage } = useIntl();
  const { loggedOut, publicKey: pubKey, follows, tags, relays, preferences } = useSelector((s: RootState) => s.login);
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
  const [tab, setTab] = useState<Tab>(() => {
    switch (preferences.defaultRootTab) {
      case "conversations":
        return RootTab.PostsAndReplies;
      case "global":
        return RootTab.Global;
      default:
        return RootTab.Posts;
    }
  });
  const [relay, setRelay] = useState<RelayOption>();
  const [allRelays, setAllRelays] = useState<RelayOption[]>();
  const tagTabs = tags.map((t, idx) => {
    return { text: `#${t}`, value: idx + 3 };
  });
  const tabs = [RootTab.Posts, RootTab.PostsAndReplies, RootTab.Global, ...tagTabs];
  const isGlobal = loggedOut || tab.value === RootTab.Global.value;

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

  function globalRelaySelector() {
    if (!isGlobal || !allRelays || allRelays.length === 0) return null;

    const paidRelays = allRelays.filter(a => a.paid);
    const publicRelays = allRelays.filter(a => !a.paid);
    return (
      <div className="flex mb10 f-end">
        <FormattedMessage
          defaultMessage="Read global from"
          description="Label for reading global feed from specific relays"
        />
        &nbsp;
        <select onChange={e => setRelay(allRelays.find(a => a.url === e.target.value))} value={relay?.url}>
          {paidRelays.length > 0 && (
            <optgroup label="Paid Relays">
              {paidRelays.map(a => (
                <option key={a.url} value={a.url}>
                  {getRelayName(a.url)}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label="Public Relays">
            {publicRelays.map(a => (
              <option key={a.url} value={a.url}>
                {getRelayName(a.url)}
              </option>
            ))}
          </optgroup>
        </select>
      </div>
    );
  }

  useEffect(() => {
    if (isGlobal) {
      return debounce(500, () => {
        const ret: RelayOption[] = [];
        System.Sockets.forEach((v, k) => {
          ret.push({
            url: k,
            paid: v.Info?.limitation?.payment_required ?? false,
          });
        });
        ret.sort(a => (a.paid ? -1 : 1));

        if (ret.length > 0 && !relay) {
          setRelay(ret[0]);
        }
        setAllRelays(ret);
      });
    }
  }, [relays, relay, tab]);

  const timelineSubect: TimelineSubject = (() => {
    if (isGlobal) {
      return { type: "global", items: [], discriminator: `all-${sha256(relay?.url ?? "").slice(0, 12)}` };
    }
    if (tab.value >= 3) {
      const hashtag = tab.text.slice(1);
      return { type: "hashtag", items: [hashtag], discriminator: hashtag };
    }

    return { type: "pubkey", items: follows, discriminator: "follows" };
  })();

  function renderTimeline() {
    if (isGlobal && !relay) return null;

    return (
      <Timeline
        key={tab.value}
        subject={timelineSubect}
        postsOnly={tab.value === RootTab.Posts.value}
        method={"TIME_RANGE"}
        window={undefined}
        relay={isGlobal ? unwrap(relay).url : undefined}
      />
    );
  }

  return (
    <>
      <div className="main-content">
        {pubKey && <Tabs tabs={tabs} tab={tab} setTab={setTab} />}
        {globalRelaySelector()}
      </div>
      {followHints()}
      {renderTimeline()}
    </>
  );
}
