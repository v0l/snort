import "./Root.css";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link, Outlet, RouteObject, useLocation, useNavigate, useParams } from "react-router-dom";
import { useIntl, FormattedMessage } from "react-intl";

import Tabs, { Tab } from "Element/Tabs";
import { RootState } from "State/Store";
import Timeline from "Element/Timeline";
import { System } from "System";
import { TimelineSubject } from "Feed/TimelineFeed";
import { debounce, getRelayName, sha256, unixNow, unwrap } from "Util";

import messages from "./messages";

interface RelayOption {
  url: string;
  paid: boolean;
}

export default function RootPage() {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const location = useLocation();
  const { publicKey: pubKey, tags, preferences } = useSelector((s: RootState) => s.login);

  const RootTab: Record<string, Tab> = {
    Posts: {
      text: formatMessage(messages.Posts),
      value: 0,
      data: "/posts",
    },
    PostsAndReplies: {
      text: formatMessage(messages.Conversations),
      value: 1,
      data: "/conversations",
    },
    Global: {
      text: formatMessage(messages.Global),
      value: 2,
      data: "/global",
    },
  };
  const tab = useMemo(() => {
    const pTab = location.pathname.split("/").slice(-1)[0];
    switch (pTab) {
      case "conversations": {
        return RootTab.PostsAndReplies;
      }
      case "global": {
        return RootTab.Global;
      }
      default: {
        return RootTab.Posts;
      }
    }
  }, [location]);

  useEffect(() => {
    if (location.pathname === "/") {
      navigate(unwrap(preferences.defaultRootTab ?? tab.data), {
        replace: true,
      });
    }
  }, [location]);

  const tagTabs = tags.map((t, idx) => {
    return { text: `#${t}`, value: idx + 3, data: `/tag/${t}` };
  });
  const tabs = [RootTab.Posts, RootTab.PostsAndReplies, RootTab.Global, ...tagTabs];

  return (
    <>
      <div className="main-content">
        {pubKey && <Tabs tabs={tabs} tab={tab} setTab={t => navigate(unwrap(t.data))} />}
      </div>
      <Outlet />
    </>
  );
}

const FollowsHint = () => {
  const { publicKey: pubKey, follows } = useSelector((s: RootState) => s.login);
  if (follows?.length === 0 && pubKey) {
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
  return null;
};

const GlobalTab = () => {
  const { relays } = useSelector((s: RootState) => s.login);
  const [relay, setRelay] = useState<RelayOption>();
  const [allRelays, setAllRelays] = useState<RelayOption[]>();
  const [now] = useState(unixNow());

  const subject: TimelineSubject = {
    type: "global",
    items: [],
    discriminator: `all-${sha256(relay?.url ?? "").slice(0, 12)}`,
  };

  function globalRelaySelector() {
    if (!allRelays || allRelays.length === 0) return null;

    const paidRelays = allRelays.filter(a => a.paid);
    const publicRelays = allRelays.filter(a => !a.paid);
    return (
      <div className="flex mb10 f-end nowrap">
        <FormattedMessage
          defaultMessage="Read global from"
          description="Label for reading global feed from specific relays"
        />
        &nbsp;
        <select
          className="f-ellipsis"
          onChange={e => setRelay(allRelays.find(a => a.url === e.target.value))}
          value={relay?.url}>
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
  }, [relays, relay]);

  return (
    <>
      {globalRelaySelector()}
      {relay && (
        <Timeline subject={subject} postsOnly={false} method={"TIME_RANGE"} window={600} relay={relay.url} now={now} />
      )}
    </>
  );
};

const PostsTab = () => {
  const follows = useSelector((s: RootState) => s.login.follows);
  const subject: TimelineSubject = { type: "pubkey", items: follows, discriminator: "follows" };

  return (
    <>
      <FollowsHint />
      <Timeline subject={subject} postsOnly={true} method={"TIME_RANGE"} window={undefined} relay={undefined} />
    </>
  );
};

const ConversationsTab = () => {
  const { follows } = useSelector((s: RootState) => s.login);
  const subject: TimelineSubject = { type: "pubkey", items: follows, discriminator: "follows" };

  return <Timeline subject={subject} postsOnly={false} method={"TIME_RANGE"} window={undefined} relay={undefined} />;
};

const TagsTab = () => {
  const { tag } = useParams();
  const subject: TimelineSubject = { type: "hashtag", items: [tag ?? ""], discriminator: `tags-${tag}` };

  return <Timeline subject={subject} postsOnly={false} method={"TIME_RANGE"} window={undefined} relay={undefined} />;
};

export const RootRoutes = [
  {
    path: "/",
    element: <RootPage />,
    children: [
      {
        path: "global",
        element: <GlobalTab />,
      },
      {
        path: "posts",
        element: <PostsTab />,
      },
      {
        path: "conversations",
        element: <ConversationsTab />,
      },
      {
        path: "tag/:tag",
        element: <TagsTab />,
      },
    ],
  },
] as RouteObject[];
